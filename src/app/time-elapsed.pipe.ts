import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeElapsed'
})
export class TimeElapsedPipe implements PipeTransform {
  transform(value: number | null): string {
    if (!value) {
      return '';
    }

    const now = new Date();
    const diff = Math.floor((now.getTime() - value * 1000) / 1000);

    if (diff < 600) { // less than 10 minutes
      return 'Recently';
    } else if (diff < 3600) { // less than 1 hour
      const mins = Math.floor(diff / 60);
      return `${mins} mins ago`;
    } else if (diff < 86400) { // less than 1 day
      const hours = Math.floor(diff / 3600);
      return `${hours} hours ago`;
    } else { // less than 1 week
      const days = Math.floor(diff / 86400);
      if (days == 1) { 
        return "A day ago";
      } else {
        return `${days} days ago`;
      }
      
    }
  }
}
