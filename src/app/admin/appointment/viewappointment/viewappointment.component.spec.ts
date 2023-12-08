import { ComponentFixture, TestBed, waitForAsync } from "@angular/core/testing";
import { ViewappointmentComponent } from "./viewappointment.component";
describe("ViewappointmentComponent", () => {
  let component: ViewappointmentComponent;
  let fixture: ComponentFixture<ViewappointmentComponent>;
  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
    imports: [ViewappointmentComponent],
}).compileComponents();
    })
  );
  beforeEach(() => {
    fixture = TestBed.createComponent(ViewappointmentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  it("should create", () => {
    expect(component).toBeTruthy();
  });
});
