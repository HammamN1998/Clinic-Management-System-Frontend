/**
 * Shared logic for the three notation odontograms (FDI / Universal / Palmer).
 *
 * The same SVG geometry powers two modes:
 *  - legacy "note" mode (patient profile): click a tooth, edit a free-text note;
 *    a tooth with a note is filled red. Nothing about this behaviour changes.
 *  - "chart" mode (dental chart page): teeth are filled by condition colour and
 *    each tooth's treatments are shown as a draggable badge card in the side
 *    gutters, connected to the tooth by a single leader line; bridges are drawn
 *    as a bar spanning their teeth.
 *
 * Geometry note: anchors come straight from each tooth `<path>`'s `getBBox()`,
 * which is in SVG user space - the same space the overlay cards/lines live in -
 * so no manual coordinate mapping is needed. In chart mode the root viewBox is
 * widened by `GUTTER` on each side to make room for the badge cards.
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
import { isNullOrUndefined } from '@swimlane/ngx-datatable';
import { from } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { PatientService } from '@core/service/patient.service';
import { NotificationService } from '@core/service/notification.service';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import {
  DentalNotation,
  SpanTreatment,
  SpecialDiagrams,
  ToothChartState,
} from '@core/models/patient.model';
import {
  getOperationLabelKey,
  getToothShortLabel,
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

/** A bridge bar drawn along the crowns of its teeth. */
export interface BridgeBarVM {
  id: string;
  points: string;      // polyline points through each tooth anchor
  color: string;
  selected: boolean;
  labelX: number;
  labelY: number;
}

interface Anchor { cx: number; cy: number; top: number; }

@Directive()
export abstract class OdontogramDiagramBase
  extends UnsubscribeOnDestroyAdapter
  implements AfterViewInit, OnChanges {

  // The notation this diagram renders + its legacy notes array key.
  abstract readonly notation: DentalNotation;
  abstract readonly legacyArrayKey: keyof SpecialDiagrams;

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

  // ----- legacy note-mode state -----------------------------------------
  selectedTooth!: string;
  toothNote = '';

  // ----- view refs (provided by the transformed template) ---------------
  @ViewChild('odontogramSvg') svgRef?: ElementRef<SVGSVGElement>;
  @ViewChild('odontogramWrapper') wrapperRef?: ElementRef<HTMLElement>;

  // ----- rendered overlay view-models -----------------------------------
  badgeCards: BadgeCardVM[] = [];
  bridgeBars: BridgeBarVM[] = [];

  // viewBox + native size (legacy keeps the original fixed 442x558)
  protected static readonly BASE_W = 442;
  protected static readonly BASE_H = 558;
  // Gutters reserve just enough room for the badge cards; keeping them tight
  // lets the teeth image (BASE_W wide) fill most of the rendered diagram.
  protected static readonly GUTTER = 125;
  private static readonly CARD_W = 115;
  private static readonly ROW_H = 16;
  private static readonly CARD_PAD = 6;

  private anchors: { [toothId: string]: Anchor } = {};
  private drag: { toothId: string; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null = null;
  private justDragged = false;

  protected constructor(
    protected patientService: PatientService,
    protected notificationService: NotificationService,
    protected translate: TranslateService,
  ) {
    super();
  }

  // =====================================================================
  // Template-bound style / selection / click (used by every tooth path)
  // =====================================================================
  getToothStyle(toothId: string): { [k: string]: string } {
    if (!this.chartMode) {
      const exists = this.isToothExist(toothId);
      return { fill: exists ? 'red' : '', 'fill-opacity': exists ? '0.5' : '' };
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
      return this.selectedTooth === toothId;
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
    } else {
      this.selectTooth(toothId);
    }
  }

  // =====================================================================
  // Legacy note mode (patient profile)
  // =====================================================================
  selectTooth(toothId: string): void {
    this.selectedTooth = toothId;
    const notes = this.legacyNotes();
    const idx = notes.findIndex((tooth) => !isNullOrUndefined(tooth[toothId]));
    this.toothNote = idx !== -1 ? notes[idx][toothId] : '';
  }

  saveToothNote(): void {
    this.subs.sink = from(
      this.patientService.updateSpecialDiagramNote(this.legacyArrayKey, this.selectedTooth, this.toothNote),
    ).subscribe({
      next: () => {
        this.notificationService.showSnackBarNotification(
          'black',
          this.translate.instant('PATIENTS.DENTAL_CHART.MESSAGES.NOTE_SAVED'),
          'bottom',
          'center',
        );
      },
      error: (error) => console.log('error: ' + error),
    });
  }

  isToothExist(toothId: string): boolean {
    if (this.chartMode) {
      return false; // chart fills are handled in getToothStyle
    }
    const notes = this.legacyNotes();
    const idx = notes.findIndex(
      (tooth) => !isNullOrUndefined(tooth[toothId]) && (tooth[toothId] ?? '').trim() !== '',
    );
    return idx !== -1;
  }

  private legacyNotes(): { [toothId: string]: string }[] {
    const diagrams = this.patientService.getDialogData().specialDiagrams;
    return (diagrams && diagrams[this.legacyArrayKey]) || [];
  }

  // =====================================================================
  // viewBox / sizing
  // =====================================================================
  get viewBox(): string {
    if (!this.chartMode) {
      return `0 0 ${OdontogramDiagramBase.BASE_W} ${OdontogramDiagramBase.BASE_H}`;
    }
    const g = OdontogramDiagramBase.GUTTER;
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
      ? OdontogramDiagramBase.BASE_W + 2 * OdontogramDiagramBase.GUTTER
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
    const cards: BadgeCardVM[] = [];
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

    const g = OdontogramDiagramBase.GUTTER;
    const leftX = -g + 6;
    const rightX = OdontogramDiagramBase.BASE_W + 6;
    cards.push(...this.stackSide(left, leftX, 'left'));
    cards.push(...this.stackSide(right, rightX, 'right'));
    this.badgeCards = cards;
  }

  private stackSide(
    entries: { toothId: string; anchor: Anchor }[],
    gutterX: number,
    side: 'left' | 'right',
  ): BadgeCardVM[] {
    const cards: BadgeCardVM[] = [];
    // Track the bottom of the last auto-placed card so cards spawn next to
    // their tooth (centered on it) and only shift down to avoid overlap.
    let lastBottom = -Infinity;
    for (const { toothId, anchor } of entries) {
      const state = this.toothStates[toothId];
      const rows = this.buildRows(state);
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
        toothId, x, y, width: OdontogramDiagramBase.CARD_W, height, rows,
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
      const short = opLabel.length > 12 ? opLabel.slice(0, 11) + '…' : opLabel;
      return {
        treatmentId: t.id,
        text: `${i + 1}. ${short}`,
        statusColor: TREATMENT_STATUS_COLOR[t.status],
      };
    });
  }

  // =====================================================================
  // Bridges (span bars)
  // =====================================================================
  private computeBridges(): void {
    this.bridgeBars = [];
    for (const bridge of this.spanningTreatments || []) {
      const pts = bridge.toothIds
        .map((id) => this.anchors[id])
        .filter((a): a is Anchor => !!a);
      if (pts.length < 2) {
        continue;
      }
      const points = pts.map((a) => `${a.cx},${a.cy}`).join(' ');
      const mid = pts[Math.floor(pts.length / 2)];
      this.bridgeBars.push({
        id: bridge.id,
        points,
        color: TREATMENT_STATUS_COLOR[bridge.status],
        selected: this.selectedBridgeId === bridge.id,
        labelX: mid.cx,
        labelY: mid.cy,
      });
    }
  }

  onBridgeClick(bridgeId: string): void {
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
