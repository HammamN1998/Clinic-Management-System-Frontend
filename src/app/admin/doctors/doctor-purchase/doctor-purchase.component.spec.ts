import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorPurchaseComponent } from './doctor-purchase.component';

describe('DoctorPurchaseComponent', () => {
  let component: DoctorPurchaseComponent;
  let fixture: ComponentFixture<DoctorPurchaseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorPurchaseComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DoctorPurchaseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
