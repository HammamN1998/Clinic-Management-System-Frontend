import { Component, Input } from '@angular/core';
import { FeatherModule } from 'angular-feather';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string | unknown[];
}

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss'],
    standalone: true,
    imports: [RouterLink, FeatherModule],
})
export class BreadcrumbComponent {
  @Input()
  title!: string;
  @Input()
  items: Array<string | BreadcrumbItem> = [];
  @Input()
  active_item!: string;

  asItem(item: string | BreadcrumbItem): BreadcrumbItem {
    return typeof item === 'string' ? { label: item } : item;
  }

  constructor() {
    //constructor
  }
}
