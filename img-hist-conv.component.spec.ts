import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImgHistConvComponent } from './img-hist-conv.component';

describe('ImgHistConvComponent', () => {
  let component: ImgHistConvComponent;
  let fixture: ComponentFixture<ImgHistConvComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ImgHistConvComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImgHistConvComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
