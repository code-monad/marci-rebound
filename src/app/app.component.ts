import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface Peer {
  id: number;
  ip: string;
  version: string;
  address: string;
  last_seen: {
    secs_since_epoch: number;
    nanos_since_epoch: number;
  };
  country: string;
  city: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  peers$: Observable<Peer[]> = new Observable<Peer[]>(observer => observer.next([]));
  pageSize = 10;
  network = 'mirana';
  totalNodes = 0;

  constructor(private http: HttpClient) {
    this.loadPeers();
    setInterval(() => {
      this.loadPeers();
    }, 10000);
  }

  loadPeers() {
    this.http.get<Peer[]>(`/peer?network=${this.network}`).subscribe(peers => {
      const peerList: Peer[] = [];
  
      for (const peer of peers) {
        if (peer.country) {
          peerList.push(peer);
        } else {
          const ipData = localStorage.getItem(peer.ip);
          if (ipData) {
            const data = JSON.parse(ipData);
            peer.country = data.country;
            peer.city = data.city;
            peerList.push(peer);
          } else {
            this.http.get(`https://ipinfo.io/${peer.ip}/json`).subscribe((data: any) => {
              peer.country = data.country;
              peer.city = data.city;
              peerList.push(peer);
              localStorage.setItem(peer.ip, JSON.stringify(data));
            });
          }
        }
      }
  
      this.totalNodes = peerList.length;
      this.peers$ = new Observable<Peer[]>(observer => observer.next(peerList.sort((a, b) => b.last_seen.secs_since_epoch - a.last_seen.secs_since_epoch)));
    });
  }

  changeNetwork(network: string) {
    this.network = network;
    this.loadPeers();
  }
  getFlagUrl(country: string): string {
    return `https://www.countryflags.io/${country.toLowerCase()}/flat/32.png`;
  }
}