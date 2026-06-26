/**
 * Shared logic for the three notation odontograms (FDI / Universal / Palmer).
 *
 * Used in chart mode on the dental chart page: teeth are filled by condition
 * colour and each tooth's treatments are shown as a draggable badge card in
 * the side gutters, connected to the tooth by a single leader line; bridges
 * are drawn as a bar spanning their teeth.
 *
 * Geometry note: anchors come straight from each tooth `<path>`'s `getBBox()`,
 * which is in SVG user space - the same space the overlay cards/lines live in -
 * so no manual coordinate mapping is needed. The root viewBox is widened by
 * `gutterWidth` on each side to make room for the badge cards.
 */
import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  ViewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import {
  DentalNotation,
  SpanTreatment,
  ToothChartState,
} from '@core/models/patient.model';
import {
  getOperationLabelKey,
  getToothShortLabel,
  orderAdjacentTeeth,
  TOOTH_SEQUENCES,
  TREATMENT_STATUS_COLOR,
} from '@core/models/dental.constants';

/** One treatment row inside a badge card. */
export interface BadgeRowVM {
  treatmentId: string;
  text: string;        // short, one-line label shown on the card
  statusColor: string;
}

/** A per-tooth badge card placed in a gutter and joined to its tooth. */
export interface BadgeCardVM {
  toothId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rows: BadgeRowVM[];
  // leader line endpoints (tooth anchor -> nearest card edge)
  lineX1: number;
  lineY1: number;
  lineX2: number;
  lineY2: number;
}

/** Circle cap at a bridge abutment (start or end). */
export interface BridgeCapVM {
  cx: number;
  cy: number;
  r: number;
}

/** A bridge bar drawn along the crowns of its teeth. */
export interface BridgeBarVM {
  id: string;
  points: string;      // polyline points through each tooth anchor
  color: string;
  selected: boolean;
  draft?: boolean;
  labelX: number;
  labelY: number;
  startCap: BridgeCapVM;
  endCap: BridgeCapVM;
}

interface Anchor { cx: number; cy: number; top: number; }

@Directive()
export abstract class OdontogramDiagramBase
  extends UnsubscribeOnDestroyAdapter
  implements AfterViewInit, OnChanges {

  // The notation this diagram renders.
  abstract readonly notation: DentalNotation;

  // ----- mode + chart inputs --------------------------------------------
  @Input() chartMode = false;
  @Input() toothStates: { [toothId: string]: ToothChartState } = {};
  @Input() spanningTreatments: SpanTreatment[] = [];
  @Input() selectedToothId: string | null = null;
  @Input() bridgeSelectMode = false;
  @Input() bridgeDraftToothIds: string[] = [];
  @Input() selectedBridgeId: string | null = null;

  // ----- chart outputs ---------------------------------------------------
  @Output() toothSelect = new EventEmitter<string>();
  @Output() treatmentSelect = new EventEmitter<{ toothId: string; treatmentId: string }>();
  @Output() bridgeSelect = new EventEmitter<string>();
  @Output() badgeMoved = new EventEmitter<{ toothId: string; pos: { x: number; y: number } }>();

  // ----- view refs (provided by the transformed template) ---------------
  @ViewChild('odontogramSvg') svgRef?: ElementRef<SVGSVGElement>;
  @ViewChild('odontogramWrapper') wrapperRef?: ElementRef<HTMLElement>;

  // ----- rendered overlay view-models -----------------------------------
  badgeCards: BadgeCardVM[] = [];
  bridgeBars: BridgeBarVM[] = [];

  // viewBox + native size
  protected static readonly BASE_W = 442;
  protected static readonly BASE_H = 558;
  // Gutters reserve room for badge cards; widened automatically when a card
  // needs more space for long operation names.
  protected static readonly MIN_GUTTER = 125;
  private static readonly ROW_H = 16;
  private static readonly CARD_PAD = 6;
  private static readonly CARD_MIN_W = 80;
  /** Radius of the circle caps at bridge start/end. */
  private static readonly BRIDGE_CAP_R = 7;

  /** Side gutter width in SVG units; grows with the widest badge card. */
  gutterWidth = OdontogramDiagramBase.MIN_GUTTER;

  private textMeasureCtx: CanvasRenderingContext2D | null = null;

  private anchors: { [toothId: string]: Anchor } = {};
  private drag: { toothId: string; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null = null;
  private justDragged = false;

  protected constructor(protected translate: TranslateService) {
    super();
  }

  // =====================================================================
  // Template-bound style / selection / click (used by every tooth path)
  // =====================================================================
  getToothStyle(toothId: string): { [k: string]: string } {
    if (!this.chartMode) {
      return {};
    }
    // Selection (single tooth, bridge members, bridge draft) is shown via the
    // `.selected` border (see SCSS), not a fill, so the tooth keeps its
    // condition colour while selected.
    const state = this.toothStates[toothId];
    if (state && state.color) {
      return { fill: state.color, 'fill-opacity': '0.5' };
    }
    return {};
  }

  isSelected(toothId: string): boolean {
    if (!this.chartMode) {
      return false;
    }
    if (this.selectedToothId === toothId) {
      return true;
    }
    // Teeth being picked for a new/edited bridge get the same border highlight.
    if (this.bridgeDraftToothIds.includes(toothId)) {
      return true;
    }
    // When a bridge is selected, highlight its member teeth (not the bar line).
    if (this.selectedBridgeId) {
      const bridge = this.spanningTreatments.find((b) => b.id === this.selectedBridgeId);
      if (bridge?.toothIds.includes(toothId)) {
        return true;
      }
    }
    return false;
  }

  /** Unified tooth click entry point bound in the templates. */
  onToothClick(toothId: string): void {
    if (this.chartMode) {
      // The page owns selection / bridge-draft logic; just report the click.
      this.toothSelect.emit(toothId);
    }
  }

  // =====================================================================
  // viewBox / sizing
  // =====================================================================
  get viewBox(): string {
    if (!this.chartMode) {
      return `0 0 ${OdontogramDiagramBase.BASE_W} ${OdontogramDiagramBase.BASE_H}`;
    }
    const g = this.gutterWidth;
    return `${-g} 0 ${OdontogramDiagramBase.BASE_W + 2 * g} ${OdontogramDiagramBase.BASE_H}`;
  }

  get svgWidth(): number | null {
    return this.chartMode ? null : OdontogramDiagramBase.BASE_W;
  }

  get svgHeight(): number | null {
    return this.chartMode ? null : OdontogramDiagramBase.BASE_H;
  }

  private get viewBoxWidth(): number {
    return this.chartMode
      ? OdontogramDiagramBase.BASE_W + 2 * this.gutterWidth
      : OdontogramDiagramBase.BASE_W;
  }

  /** Rendered-px to SVG-user-unit scale, used to translate drag deltas. */
  private get renderScale(): number {
    const svg = this.svgRef?.nativeElement;
    if (!svg) {
      return 1;
    }
    const width = svg.getBoundingClientRect().width;
    return width > 0 ? width / this.viewBoxWidth : 1;
  }

  // =====================================================================
  // Lifecycle / recompute
  // =====================================================================
  ngAfterViewInit(): void {
    if (this.chartMode) {
      // Defer so the SVG is laid out before getBBox()/scale are read.
      setTimeout(() => {
        this.computeAnchors();
        this.recompute();
      });
    }
  }

  ngOnChanges(): void {
    if (this.chartMode) {
      setTimeout(() => {
        if (!Object.keys(this.anchors).length) {
          this.computeAnchors();
        }
        this.recompute();
      });
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (this.chartMode) {
      this.recompute();
    }
  }

  private recompute(): void {
    this.layoutBadges();
    this.computeBridges();
  }

  /** Read each tooth path's bbox once; anchors are static after layout. */
  private computeAnchors(): void {
    const svg = this.svgRef?.nativeElement;
    if (!svg) {
      return;
    }
    this.anchors = {};
    for (const toothId of TOOTH_SEQUENCES[this.notation].flat()) {
      const el = svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(toothId)}`);
      if (!el) {
        continue;
      }
      try {
        const box = el.getBBox();
        this.anchors[toothId] = { cx: box.x + box.width / 2, cy: box.y + box.height / 2, top: box.y };
      } catch {
        // getBBox throws for not-yet-rendered elements; skip gracefully.
      }
    }
  }

  // =====================================================================
  // Badge cards (one per tooth that has treatments)
  // =====================================================================
  private layoutBadges(): void {
    const left: { toothId: string; anchor: Anchor }[] = [];
    const right: { toothId: string; anchor: Anchor }[] = [];

    for (const toothId of Object.keys(this.toothStates)) {
      const state = this.toothStates[toothId];
      const anchor = this.anchors[toothId];
      if (!state || !state.treatments.length || !anchor) {
        continue;
      }
      (anchor.cx < OdontogramDiagramBase.BASE_W / 2 ? left : right).push({ toothId, anchor });
    }

    left.sort((a, b) => a.anchor.cy - b.anchor.cy);
    right.sort((a, b) => a.anchor.cy - b.anchor.cy);

    type BadgeEntry = { toothId: string; anchor: Anchor; rows: BadgeRowVM[]; width: number };
    const toEntry = ({ toothId, anchor }: { toothId: string; anchor: Anchor }): BadgeEntry => {
      const rows = this.buildRows(this.toothStates[toothId]);
      return { toothId, anchor, rows, width: this.computeCardWidth(toothId, rows) };
    };
    const leftEntries = left.map(toEntry);
    const rightEntries = right.map(toEntry);

    const maxCardW = Math.max(
      0,
      ...leftEntries.map((e) => e.width),
      ...rightEntries.map((e) => e.width),
    );
    // Keep cards in the gutter without overlapping the teeth (x >= 0).
    this.gutterWidth = Math.max(OdontogramDiagramBase.MIN_GUTTER, Math.ceil(maxCardW) + 12);

    const g = this.gutterWidth;
    const leftX = -g + 6;
    const rightX = OdontogramDiagramBase.BASE_W + 6;
    this.badgeCards = [
      ...this.stackSide(leftEntries, leftX, 'left'),
      ...this.stackSide(rightEntries, rightX, 'right'),
    ];
  }

  private stackSide(
    entries: { toothId: string; anchor: Anchor; rows: BadgeRowVM[]; width: number }[],
    gutterX: number,
    side: 'left' | 'right',
  ): BadgeCardVM[] {
    const cards: BadgeCardVM[] = [];
    // Track the bottom of the last auto-placed card so cards spawn next to
    // their tooth (centered on it) and only shift down to avoid overlap.
    let lastBottom = -Infinity;
    for (const { toothId, anchor, rows, width } of entries) {
      const state = this.toothStates[toothId];
      const height = rows.length * OdontogramDiagramBase.ROW_H + 2 * OdontogramDiagramBase.CARD_PAD + 14;

      // Persisted (dragged) position wins; otherwise place the card beside its
      // tooth, nudging it down only when it would collide with the one above.
      const pos = state.badgePos;
      const x = pos ? pos.x : gutterX;
      let y: number;
      if (pos) {
        y = pos.y;
      } else {
        y = Math.max(anchor.cy - height / 2, lastBottom + 8);
        lastBottom = y + height;
      }

      const card: BadgeCardVM = {
        toothId, x, y, width, height, rows,
        lineX1: anchor.cx, lineY1: anchor.cy, lineX2: 0, lineY2: 0,
      };
      this.updateConnector(card, side);
      cards.push(card);
    }
    return cards;
  }

  /** Recompute the leader line from the tooth anchor to the card's near edge. */
  private updateConnector(card: BadgeCardVM, side: 'left' | 'right'): void {
    const onLeft = side === 'left' ? true : card.x < OdontogramDiagramBase.BASE_W / 2;
    card.lineX2 = onLeft ? card.x + card.width : card.x;
    card.lineY2 = card.y + card.height / 2;
  }

  private buildRows(state: ToothChartState): BadgeRowVM[] {
    return state.treatments.map((t, i) => {
      const opLabel = this.translate.instant(getOperationLabelKey(t.operation));
      return {
        treatmentId: t.id,
        text: `${i + 1}. ${opLabel}`,
        statusColor: TREATMENT_STATUS_COLOR[t.status],
      };
    });
  }

  /** Badge width follows the longest label (title or treatment row) inside the card. */
  private computeCardWidth(toothId: string, rows: BadgeRowVM[]): number {
    const titleW = this.measureText(this.toothShortLabel(toothId), 12, '700');
    let maxRowW = 0;
    for (const row of rows) {
      maxRowW = Math.max(maxRowW, this.measureText(row.text, 13));
    }
    const contentW = Math.max(6 + titleW + 8, 20 + maxRowW + 8);
    return Math.max(OdontogramDiagramBase.CARD_MIN_W, Math.ceil(contentW));
  }

  /** Canvas text measurement — mirrors badge-card-title / badge-row-text styles. */
  private measureText(text: string, fontSize: number, fontWeight = 'normal'): number {
    if (!this.textMeasureCtx) {
      const canvas = document.createElement('canvas');
      this.textMeasureCtx = canvas.getContext('2d');
    }
    if (!this.textMeasureCtx) {
      return text.length * fontSize * 0.55;
    }
    this.textMeasureCtx.font = `${fontWeight} ${fontSize}px Roboto, "Helvetica Neue", sans-serif`;
    return this.textMeasureCtx.measureText(text).width;
  }

  // =====================================================================
  // Bridges (span bars)
  // =====================================================================
  private computeBridges(): void {
    this.bridgeBars = [];
    for (const bridge of this.spanningTreatments || []) {
      const bar = this.buildBridgeBar(
        bridge.id,
        bridge.toothIds,
        TREATMENT_STATUS_COLOR[bridge.status],
        this.selectedBridgeId === bridge.id,
      );
      if (bar) {
        this.bridgeBars.push(bar);
      }
    }
    // Live preview while drawing a new bridge (not yet saved).
    if (this.bridgeSelectMode && !this.selectedBridgeId) {
      const ordered = orderAdjacentTeeth(this.notation, this.bridgeDraftToothIds);
      if (ordered) {
        const draft = this.buildBridgeBar(
          '__draft__',
          ordered,
          TREATMENT_STATUS_COLOR.pending,
          false,
          true,
        );
        if (draft) {
          this.bridgeBars.push(draft);
        }
      }
    }
  }

  private bridgeCap(at: Anchor): BridgeCapVM {
    return { cx: at.cx, cy: at.cy, r: OdontogramDiagramBase.BRIDGE_CAP_R };
  }

  private buildBridgeBar(
    id: string,
    toothIds: string[],
    color: string,
    selected: boolean,
    draft = false,
  ): BridgeBarVM | null {
    const pts = toothIds
      .map((tid) => this.anchors[tid])
      .filter((a): a is Anchor => !!a);
    if (pts.length < 2) {
      return null;
    }
    const points = pts.map((a) => `${a.cx},${a.cy}`).join(' ');
    const mid = pts[Math.floor(pts.length / 2)];
    return {
      id,
      points,
      color,
      selected,
      draft,
      labelX: mid.cx,
      labelY: mid.cy,
      startCap: this.bridgeCap(pts[0]),
      endCap: this.bridgeCap(pts[pts.length - 1]),
    };
  }

  onBridgeClick(bridgeId: string): void {
    if (bridgeId === '__draft__') {
      return;
    }
    this.bridgeSelect.emit(bridgeId);
  }

  /** Short, dentist-facing label for a tooth (used as the badge card title). */
  toothShortLabel(toothId: string): string {
    return getToothShortLabel(toothId);
  }

  // =====================================================================
  // Badge row interaction + drag
  // =====================================================================
  onRowClick(card: BadgeCardVM, row: BadgeRowVM): void {
    if (this.justDragged) {
      this.justDragged = false;
      return;
    }
    this.treatmentSelect.emit({ toothId: card.toothId, treatmentId: row.treatmentId });
  }

  onCardPointerDown(card: BadgeCardVM, event: PointerEvent): void {
    event.stopPropagation();
    this.drag = {
      toothId: card.toothId,
      startX: event.clientX,
      startY: event.clientY,
      originX: card.x,
      originY: card.y,
      moved: false,
    };
  }

  @HostListener('document:pointermove', ['$event'])
  onPointerMove(event: PointerEvent): void {
    if (!this.drag) {
      return;
    }
    const dxPx = event.clientX - this.drag.startX;
    const dyPx = event.clientY - this.drag.startY;
    if (Math.abs(dxPx) + Math.abs(dyPx) > 3) {
      this.drag.moved = true;
    }
    const scale = this.renderScale;
    const card = this.badgeCards.find((c) => c.toothId === this.drag!.toothId);
    if (!card) {
      return;
    }
    card.x = this.drag.originX + dxPx / scale;
    card.y = this.drag.originY + dyPx / scale;
    this.updateConnector(card, card.x < OdontogramDiagramBase.BASE_W / 2 ? 'left' : 'right');
  }

  @HostListener('document:pointerup')
  onPointerUp(): void {
    if (!this.drag) {
      return;
    }
    const { toothId, moved } = this.drag;
    this.drag = null;
    if (moved) {
      this.justDragged = true; // swallow the click that follows a drag
      const card = this.badgeCards.find((c) => c.toothId === toothId);
      if (card) {
        this.badgeMoved.emit({ toothId, pos: { x: card.x, y: card.y } });
      }
    }
  }

}
