import { Component, Input, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-storage-usage',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './storage-usage.component.html',
  styleUrls: ['./storage-usage.component.scss']
})
export class StorageUsageComponent implements AfterViewInit {
  @Input() usedStorage: number = 0;
  @Input() totalStorage: number = 0;
  @Input() percentage: number = 0;
  
  @ViewChild('doughnutChart') private chartRef!: ElementRef;
  private chart: any;

  ngAfterViewInit(): void {
    this.createChart();
  }

  private createChart(): void {
    if (this.chartRef) {
      const ctx = this.chartRef.nativeElement.getContext('2d');
      
      this.chart = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Used', 'Available'],
          datasets: [{
            data: [this.usedStorage, this.totalStorage - this.usedStorage],
            backgroundColor: ['#3B82F6', '#E5E7EB'],
            borderWidth: 0,
            borderRadius: 5,
            hoverOffset: 4
          }]
        },
        options: {
          cutout: '70%',
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  const label = context.label || '';
                  const value = context.raw as number;
                  return `${label}: ${value} GB`;
                }
              }
            }
          }
        }
      });
    }
  }

  get remainingStorage(): number {
    return this.totalStorage - this.usedStorage;
  }

  get formattedPercentage(): string {
    return `${this.percentage}%`;
  }
}
