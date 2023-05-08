import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Chart } from '@antv/g2';
import { map } from 'rxjs/operators';

interface Peer {
  id: number;
  ip: string;
  version: string; // 0.109.0 (bd8937b 2023-04-19)
  version_short: string; // 0.109.0
  address: string;
  last_seen: {
    secs_since_epoch: number;
    nanos_since_epoch: number;
  };
  country: string;
  city: string;
}

interface Location {
  lat: string;
  lon: string;
}

interface CatchLocation {
  [key: string]: Location
}

interface HeatMapData {
  [key: string]: any[]
}

interface RankingsGraphData {
  [key: string]: number
}

interface RankingsDataItem {
  name: string;
  value: number;
  label: string;
}

interface VersionCount {
  [key: string]: number;
}

interface VersionDataItem {
  version: string;
  value: number;
  label: string;
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
  versionCount: VersionCount = {};

  constructor(private http: HttpClient) {
    this.loadPeers();
    setInterval(() => {
      this.loadPeers();
    }, 20000);
  }

  loadPeers() {
    this.http.get<Peer[]>(`/peer?network=${this.network}`).subscribe(peers => {
      const peerList: Peer[] = [];
      const versionCount: VersionCount = {};
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
        if (peer.version_short in versionCount) {
          versionCount[peer.version_short]++;
        } else {
          versionCount[peer.version_short] = 1;
        }
      }

      this.totalNodes = peerList.length;
      this.peers$ = new Observable<Peer[]>(observer => observer.next(peerList.sort((a, b) => b.last_seen.secs_since_epoch - a.last_seen.secs_since_epoch)));
      this.versionCount = versionCount;
      this.loadLatLon(peers);
      this.renderVersionGraph(versionCount);
    });
  }

  changeNetwork(network: string) {
    this.network = network;
    this.loadPeers();
  }
  getFlagUrl(country: string): string {
    return `https://www.countryflags.io/${country.toLowerCase()}/flat/32.png`;
  }
  async loadLatLon(peerList: Peer[]) {
    const CATCH_KEY = '__catchLocation';
    let citys = this.getCityAndCountry(peerList);

    let catchLocation = localStorage.getItem(CATCH_KEY) || {} as CatchLocation;
    if (typeof catchLocation === 'string') catchLocation = JSON.parse(catchLocation);

    Object.keys(catchLocation).forEach(key => {
      if (citys.includes(key)) citys = citys.filter(item => item !== key);
    });

    for (const key of citys) {
      const [city, country] = key.split(',');
      const loadLocation = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)},${encodeURIComponent(country)}&format=json`);
      const data: Location[] = await loadLocation.json();

      if (data.length) {
        const { lat, lon } = data[0];
        if (typeof catchLocation === 'object') {
          catchLocation[key] = { lat, lon };
        }
      }
    }

    localStorage.setItem(CATCH_KEY, JSON.stringify(catchLocation));
    this.renderMapGraph(catchLocation as CatchLocation, peerList);
  }
  getCityAndCountry(peerList: Peer[]) {
    return peerList.reduce((result, value) => {
      const key = `${value.city},${value.country}`;

      if (result.includes(key)) return result;
      result.push(key);
      return result;
    }, [] as string[]);
  }
  paseGraphData(catchLocation: CatchLocation, peerList: Peer[]): { heatMapData: HeatMapData, rankingsGraphData: RankingsGraphData } {
    const heatMapData: HeatMapData = {};
    const rankingsGraphData: RankingsGraphData = {};

    peerList.forEach(item => {
      const { city, country } = item;
      const key = `${city},${country}`;

      if (heatMapData[key]) {
        const [lat, lon, count] = heatMapData[key];
        heatMapData[key] = [lat, lon, count + 5000];
        rankingsGraphData[key] += 1;
      } else {
        const { lat, lon } = catchLocation[key];
        heatMapData[key] = [lat, lon, 1];
        rankingsGraphData[key] = 1;
      }
    });

    return {
      heatMapData,
      rankingsGraphData
    }
  }
  deconstructHeatMapData(heatMapData: HeatMapData) {
    return Object.keys(heatMapData).reduce((result, value) => {
      result.push(heatMapData[value]);
      return result;
    }, [] as object[]);
  }
  deconstructRankingsGraphData(rankingsGraphData: RankingsGraphData) {
    return Object.keys(rankingsGraphData).reduce((result, value) => {
      const [city, country] = value.split(",");
      result.push({
        name: country,
        value: rankingsGraphData[value],
        label: city
      });
      return result;
    }, [] as RankingsDataItem[]);
  }
  renderMapGraph(catchLocation: CatchLocation, peerList: Peer[]) {
    const container = 'mapGraph';
    if (!document.getElementById(container)) return;

    let map;
    const _window = window as any;
    const L = _window.L;
    const { heatMapData, rankingsGraphData } = this.paseGraphData(catchLocation, peerList);

    if (_window._map) map = _window._map;
    else {
      map = L.map(container).setView([0, 0], 1);
      _window._map = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
      map.addControl(L.control.fullscreen());
    }

    document.querySelector(".leaflet-heatmap-layer")?.remove();
    L.heatLayer(this.deconstructHeatMapData(heatMapData), { radius: 15 }).addTo(map);

    this.renderRankingsGraph(rankingsGraphData);
  }
  renderRankingsGraph(rankingsGraphData: RankingsGraphData) {
    const container = 'rankingGraph';
    if (!document.getElementById(container)) return;

    let data = this.deconstructRankingsGraphData(rankingsGraphData);
    const chart = new Chart({
      container,
      theme: 'classic',
      autoFit: true
    });

    data = data.sort((prev: RankingsDataItem, next: RankingsDataItem) => next.value - prev.value);
    data = data.slice(0, 10);

    chart
      .interval()
      .data(data)
      .encode('x', 'name')
      .encode('y', 'value')
      .label({
        text: 'value',
        style: {
          fill: '#fff',
        }
      })
      .tooltip({
        title: (d: RankingsDataItem) => `${d.label} - ${d.name}`
      });

    chart.render();
  }
  renderVersionGraph(versionCount: VersionCount) {
    const container = 'versionGraph';
    if (!document.getElementById(container)) return;

    let data = Object.keys(versionCount).map(key => ({ version: key.split('(')[0], value: versionCount[key] })).sort((a, b) => b.value - a.value);

    const chart = new Chart({
      container,
      theme: 'classic',
      autoFit: true,
      paddingLeft: 100,
    });

    chart.coordinate({ transform: [{ type: 'transpose' }] });
    data = data.slice(0, 10);

    chart
      .interval()
      .data(data)
      .encode('x', 'version')
      .encode('y', 'value')
      .label({
        text: 'value',
        style: {
          fill: '#fff',
        }
      });

    chart.render();
  }
}
