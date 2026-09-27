import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ProcessionData } from '../src/types/procession.js';
import { initialProcessionData } from './default-data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'procession.json');

export class ProcessionStore {
  private data: ProcessionData;

  constructor() {
    this.ensureDataDir();
    this.data = this.loadData();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadData(): ProcessionData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          ...initialProcessionData,
          ...parsed,
          // ensure arrays are intact
          stops: parsed.stops || initialProcessionData.stops,
          customRouteCoordinates: parsed.customRouteCoordinates || initialProcessionData.customRouteCoordinates,
        };
      }
    } catch (err) {
      console.error('Error loading data from file, falling back to initial data:', err);
    }
    this.saveData(initialProcessionData);
    return JSON.parse(JSON.stringify(initialProcessionData));
  }

  public getData(): ProcessionData {
    return this.data;
  }

  public saveData(newData?: ProcessionData): void {
    if (newData) {
      this.data = newData;
    }
    this.data.lastUpdated = new Date().toISOString();
    try {
      this.ensureDataDir();
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving data to disk:', err);
    }
  }

  public resetToDefault(): ProcessionData {
    this.data = JSON.parse(JSON.stringify(initialProcessionData));
    this.saveData();
    return this.data;
  }
}

export const store = new ProcessionStore();
