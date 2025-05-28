import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileManagerRoutingModule } from './file-manager-routing.module';
import { FileManagerComponent } from './file-manager/file-manager.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FileManagerRoutingModule,
    FileManagerComponent
  ]
})
export class FileManagerModule { }
