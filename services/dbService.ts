import { Note, Track, Sample, Plugin, ProjectEvent, ProjectEventType } from '../types';
import { dataRetentionService } from './dataRetentionService';

// sql.js is loaded via a script tag in index.html and will be on the window
declare var initSqlJs: any;

const DB_NAME = 'music_assistant.db';
let db: any = null;

const createTables = () => {
  if (!db) return;
  const tracksSql = `
  CREATE TABLE IF NOT EXISTS tracks (
    id TEXT PRIMARY KEY,
    name TEXT,
    path TEXT,
    genre TEXT,
    mood TEXT,
    key TEXT,
    bpm INTEGER,
    notes TEXT,
    status TEXT,
    tags TEXT
  );
  `;
  db.run(tracksSql);
  
  const notesSql = `
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    trackId TEXT,
    author TEXT,
    text TEXT,
    timestamp TEXT
  );
  `;
  db.run(notesSql);

  const samplesSql = `
  CREATE TABLE IF NOT EXISTS samples (
    id TEXT PRIMARY KEY,
    name TEXT,
    path TEXT,
    tags TEXT
  );
  `;
  db.run(samplesSql);

  const pluginsSql = `
  CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT,
    manufacturer TEXT,
    type TEXT
  );
  `;
  db.run(pluginsSql);
  
  const projectEventsSql = `
   CREATE TABLE IF NOT EXISTS project_events (
    id TEXT PRIMARY KEY,
    type TEXT,
    title TEXT,
    date TEXT,
    notes TEXT,
    relatedTrackId TEXT
  );
  `;
  db.run(projectEventsSql);

  const trainingDataBanksSql = `
  CREATE TABLE IF NOT EXISTS training_data_banks (
    id TEXT PRIMARY KEY,
    name TEXT,
    trainedAt TEXT,
    isActive INTEGER,
    modelData TEXT
  );
  `;
  db.run(trainingDataBanksSql);

  const trainingFilesSql = `
  CREATE TABLE IF NOT EXISTS training_files (
    id TEXT PRIMARY KEY,
    bankId TEXT,
    fileName TEXT,
    fileSize INTEGER,
    fileType TEXT,
    uploadedAt TEXT,
    FOREIGN KEY (bankId) REFERENCES training_data_banks (id)
  );
  `;
  db.run(trainingFilesSql);

  console.log("Database tables checked/created.");
};

const seedDatabase = () => {
    console.log("Database is empty. Seeding with initial mock data...");
    
    const mockSamples: Sample[] = [
        { id: 'smpl_001', name: 'kick_trap_hard.wav', path: '/samples/drums/kick_trap_hard.wav', tags: ['kick', 'trap', 'punchy', '808'] },
        { id: 'smpl_002', name: 'snare_lofi_vintage.wav', path: '/samples/drums/snare_lofi_vintage.wav', tags: ['snare', 'lo-fi', 'vinyl', 'warm'] },
        { id: 'smpl_003', name: 'vocal_choir_ahh.wav', path: '/samples/vox/vocal_choir_ahh.wav', tags: ['vocal', 'choir', 'pad', 'ethereal'] },
        { id: 'smpl_004', name: 'loop_synth_arpeggio_120.wav', path: '/samples/loops/synth_arp_120.wav', tags: ['loop', 'synth', 'arp', '120bpm', 'melodic'] },
    ];
    addSamples(mockSamples);

    const mockPlugins: Plugin[] = [
        { id: 'plg_001', name: 'Serum', manufacturer: 'Xfer Records', type: 'Instrument' },
        { id: 'plg_002', name: 'Valhalla VintageVerb', manufacturer: 'Valhalla DSP', type: 'Effect' },
        { id: 'plg_003', name: 'Ozone 10', manufacturer: 'iZotope', type: 'Effect' },
        { id: 'plg_004', name: 'Diva', manufacturer: 'u-he', type: 'Instrument' },
    ];
    addPlugins(mockPlugins);
    
    const now = new Date();
    const createDate = (daysToAdd: number) => {
        const date = new Date(now);
        date.setDate(date.getDate() + daysToAdd);
        return date.toISOString();
    };
    const mockEvents: ProjectEvent[] = [
        { id: 'evt_001', type: ProjectEventType.TASK, title: 'Finalize mix for "Sunset Drive"', date: createDate(2), notes: 'Focus on vocal clarity.' },
        { id: 'evt_002', type: ProjectEventType.BRIEF, title: 'Sync Brief Due: "Cyber Runner" Game', date: createDate(7), notes: 'Needs high-energy electronic tracks.' },
        { id: 'evt_003', type: ProjectEventType.RELEASE, title: 'Release "Starlight EP"', date: createDate(17) },
        { id: 'evt_004', type: ProjectEventType.REMINDER, title: 'Register songs with PRO', date: createDate(31), notes: 'Register "Sunset Drive" and all EP tracks.' },
    ];
    addProjectEvents(mockEvents);

    console.log("Mock data seeding complete.");
}

const saveDatabase = () => {
  if (db) {
    try {
      const data = db.export();
      const base64 = btoa(String.fromCharCode.apply(null, Array.from(data)));
      localStorage.setItem(DB_NAME, base64);
    } catch (e) {
      console.error("Failed to save database to localStorage", e);
    }
  }
};

export const initDB = async (): Promise<void> => {
  if (db) return;
  try {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
    });
    
    const savedDbBase64 = localStorage.getItem(DB_NAME);
    if (savedDbBase64) {
      console.log("Loading database from localStorage...");
      const binaryString = atob(savedDbBase64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      db = new SQL.Database(bytes);
    } else {
      console.log("Creating new database...");
      db = new SQL.Database();
    }

    createTables();

    // Check if the database is empty and seed if necessary
    const trackCountResult = db.exec("SELECT count(*) FROM tracks");
    if (trackCountResult.length > 0 && trackCountResult[0].values.length > 0) {
        const trackCount = trackCountResult[0].values[0][0];
        if (trackCount === 0) {
            seedDatabase();
        }
    }

    saveDatabase();
  } catch (err) {
    console.error("Failed to initialize database", err);
    throw err;
  }
};

const stmtResultToObject = (stmt: any): any[] => {
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// --- Tracks ---
export const getTracks = async (): Promise<Track[]> => {
  if (!db) throw new Error("Database not initialized");
  
  const stmt = db.prepare("SELECT * FROM tracks");
  const results = stmtResultToObject(stmt);
  
  return results.map((row: any) => ({
    ...row,
    status: JSON.parse(row.status || '{}'),
    tags: JSON.parse(row.tags || '[]'),
    bpm: Number(row.bpm)
  }));
};

export const addTracks = async (tracks: Track[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    if (tracks.length === 0) return;

    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("INSERT OR IGNORE INTO tracks (id, name, path, genre, mood, key, bpm, notes, status, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    try {
        tracks.forEach(track => {
            stmt.run([
                track.id,
                track.name,
                track.path,
                track.genre,
                track.mood,
                track.key,
                track.bpm,
                track.notes,
                JSON.stringify(track.status),
                JSON.stringify(track.tags || [])
            ]);
            
            // Automatically retain track data
            dataRetentionService.retainTrack(track, 'scan');
        });
        db.run("COMMIT");
    } catch(e) {
        db.run("ROLLBACK");
        console.error("Failed to add tracks in transaction", e);
        throw e;
    } finally {
        stmt.free();
    }
    saveDatabase();
};

export const updateTrack = async (track: Track): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    const stmt = db.prepare(`UPDATE tracks SET name = ?, path = ?, genre = ?, mood = ?, key = ?, bpm = ?, notes = ?, status = ?, tags = ? WHERE id = ?`);
    try {
        stmt.run([track.name, track.path, track.genre, track.mood, track.key, track.bpm, track.notes, JSON.stringify(track.status), JSON.stringify(track.tags || []), track.id]);
    } catch (e) {
        console.error("Failed to update track", e);
        throw e;
    } finally {
        stmt.free();
    }
    saveDatabase();
};

// --- Notes ---
export const getNotes = async (): Promise<Note[]> => {
  if (!db) throw new Error("Database not initialized");
  const stmt = db.prepare("SELECT * FROM notes");
  return stmtResultToObject(stmt) as Note[];
};

export const addNote = async (note: Note): Promise<void> => {
    await addNotes([note]);
};

export const addNotes = async (notes: Note[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    if (notes.length === 0) return;

    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("INSERT OR IGNORE INTO notes (id, trackId, author, text, timestamp) VALUES (?, ?, ?, ?, ?)");
    try {
        notes.forEach(note => stmt.run([note.id, note.trackId, note.author, note.text, note.timestamp]));
        db.run("COMMIT");
    } catch (e) {
        db.run("ROLLBACK");
        console.error("Failed to add notes", e);
        throw e;
    } finally {
        stmt.free();
    }
    saveDatabase();
};


// --- Samples ---
export const getSamples = async (): Promise<Sample[]> => {
    if (!db) throw new Error("Database not initialized");
    const stmt = db.prepare("SELECT * FROM samples");
    const results = stmtResultToObject(stmt);
    return results.map((row: any) => ({ ...row, tags: JSON.parse(row.tags || '[]') }));
};

export const addSamples = async (samples: Sample[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    if (samples.length === 0) return;
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("INSERT OR IGNORE INTO samples (id, name, path, tags) VALUES (?, ?, ?, ?)");
    try {
        samples.forEach(sample => {
            stmt.run([sample.id, sample.name, sample.path, JSON.stringify(sample.tags || [])]);
            
            // Automatically retain sample data
            dataRetentionService.retainSample(sample, 'scan');
        });
        db.run("COMMIT");
    } catch(e) {
        db.run("ROLLBACK"); throw e;
    } finally { stmt.free(); }
    saveDatabase();
};

// --- Plugins ---
export const getPlugins = async (): Promise<Plugin[]> => {
    if (!db) throw new Error("Database not initialized");
    const stmt = db.prepare("SELECT * FROM plugins");
    return stmtResultToObject(stmt) as Plugin[];
};

export const addPlugins = async (plugins: Plugin[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    if (plugins.length === 0) return;
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("INSERT OR IGNORE INTO plugins (id, name, manufacturer, type) VALUES (?, ?, ?, ?)");
    try {
        plugins.forEach(plugin => stmt.run([plugin.id, plugin.name, plugin.manufacturer, plugin.type]));
        db.run("COMMIT");
    } catch(e) {
        db.run("ROLLBACK"); throw e;
    } finally { stmt.free(); }
    saveDatabase();
};

// --- Project Events ---
export const getProjectEvents = async (): Promise<ProjectEvent[]> => {
    if (!db) throw new Error("Database not initialized");
    const stmt = db.prepare("SELECT * FROM project_events");
    // FIX: Ensure notes and relatedTrackId are correctly handled if they are null in the DB
    const results = stmtResultToObject(stmt) as any[];
    return results.map(row => ({
        ...row,
        notes: row.notes || undefined,
        relatedTrackId: row.relatedTrackId || undefined,
    }))
};

export const addProjectEvents = async (events: ProjectEvent[]): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    if (events.length === 0) return;
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("INSERT OR IGNORE INTO project_events (id, type, title, date, notes, relatedTrackId) VALUES (?, ?, ?, ?, ?, ?)");
    try {
        // FIX: Ensure undefined values are converted to null to prevent "Wrong API use" error.
        events.forEach(event => stmt.run([event.id, event.type, event.title, event.date, event.notes ?? null, event.relatedTrackId ?? null]));
        db.run("COMMIT");
    } catch(e) {
        console.error("Database error in addProjectEvents:", e);
        db.run("ROLLBACK"); throw e;
    } finally { stmt.free(); }
    saveDatabase();
};

// --- Backup & Restore ---
export const getAllDataForBackup = async () => {
    return {
        tracks: await getTracks(),
        notes: await getNotes(),
        samples: await getSamples(),
        plugins: await getPlugins(),
        projectEvents: await getProjectEvents(),
        trainingDataBanks: await getTrainingDataBanks(),
        trainingFiles: await getTrainingFiles(),
    };
};

export const restoreDataFromBackup = async (data: any) => {
    if (data.tracks) await addTracks(data.tracks);
    if (data.notes) await addNotes(data.notes);
    if (data.samples) await addSamples(data.samples);
    if (data.plugins) await addPlugins(data.plugins);
    if (data.projectEvents) await addProjectEvents(data.projectEvents);
    if (data.trainingDataBanks) {
        for (const bank of data.trainingDataBanks) {
            await addTrainingDataBank({
                ...bank,
                trainedAt: new Date(bank.trainedAt)
            });
        }
    }
    if (data.trainingFiles) {
        for (const file of data.trainingFiles) {
            await addTrainingFile({
                ...file,
                uploadedAt: new Date(file.uploadedAt)
            });
        }
    }
};

// --- Purge Functions ---
export const purgeAllData = async (): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    
    db.run("BEGIN TRANSACTION");
    try {
        db.run("DELETE FROM tracks");
        db.run("DELETE FROM notes");
        db.run("DELETE FROM samples");
        db.run("DELETE FROM plugins");
        db.run("DELETE FROM project_events");
        db.run("DELETE FROM training_data_banks");
        db.run("DELETE FROM training_files");
        db.run("COMMIT");
        
        // Also purge retention data
        dataRetentionService.purgeData({ 
            purgeAll: true, 
            purgeTracks: false, 
            purgeSamples: false, 
            purgeNotes: false, 
            purgePlugins: false, 
            purgeProjectEvents: false, 
            purgeMLData: false, 
            purgeScanResults: false 
        });
    } catch(e) {
        db.run("ROLLBACK");
        console.error("Failed to purge all data", e);
        throw e;
    }
    saveDatabase();
};

export const purgeTracks = async (): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    
    db.run("DELETE FROM tracks");
    dataRetentionService.purgeData({ 
        purgeAll: false, 
        purgeTracks: true, 
        purgeSamples: false, 
        purgeNotes: false, 
        purgePlugins: false, 
        purgeProjectEvents: false, 
        purgeMLData: false, 
        purgeScanResults: false 
    });
    saveDatabase();
};

export const purgeSamples = async (): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    
    db.run("DELETE FROM samples");
    dataRetentionService.purgeData({ 
        purgeAll: false, 
        purgeTracks: false, 
        purgeSamples: true, 
        purgeNotes: false, 
        purgePlugins: false, 
        purgeProjectEvents: false, 
        purgeMLData: false, 
        purgeScanResults: false 
    });
    saveDatabase();
};

export const purgeNotes = async (): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    
    db.run("DELETE FROM notes");
    dataRetentionService.purgeData({ 
        purgeAll: false, 
        purgeTracks: false, 
        purgeSamples: false, 
        purgeNotes: true, 
        purgePlugins: false, 
        purgeProjectEvents: false, 
        purgeMLData: false, 
        purgeScanResults: false 
    });
    saveDatabase();
};

export const purgePlugins = async (): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    
    db.run("DELETE FROM plugins");
    dataRetentionService.purgeData({ 
        purgeAll: false, 
        purgeTracks: false, 
        purgeSamples: false, 
        purgeNotes: false, 
        purgePlugins: true, 
        purgeProjectEvents: false, 
        purgeMLData: false, 
        purgeScanResults: false 
    });
    saveDatabase();
};

export const purgeProjectEvents = async (): Promise<void> => {
    if (!db) throw new Error("Database not initialized");
    
    db.run("DELETE FROM project_events");
    dataRetentionService.purgeData({ 
        purgeAll: false, 
        purgeTracks: false, 
        purgeSamples: false, 
        purgeNotes: false, 
        purgePlugins: false, 
        purgeProjectEvents: true, 
        purgeMLData: false, 
        purgeScanResults: false 
    });
    saveDatabase();
};

export const purgeMLData = async (): Promise<void> => {
    dataRetentionService.purgeData({ 
        purgeAll: false, 
        purgeTracks: false, 
        purgeSamples: false, 
        purgeNotes: false, 
        purgePlugins: false, 
        purgeProjectEvents: false, 
        purgeMLData: true, 
        purgeScanResults: false 
    });
};

export const purgeScanResults = async (): Promise<void> => {
    dataRetentionService.purgeData({ 
        purgeAll: false, 
        purgeTracks: false, 
        purgeSamples: false, 
        purgeNotes: false, 
        purgePlugins: false, 
        purgeProjectEvents: false, 
        purgeMLData: false, 
        purgeScanResults: true 
    });
};

// --- Training Data Functions ---
export const addTrainingDataBank = async (bank: { id: string; name: string; trainedAt: Date; isActive: boolean; modelData?: any }) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
        const stmt = db.prepare('INSERT INTO training_data_banks (id, name, trainedAt, isActive, modelData) VALUES (?, ?, ?, ?, ?)');
        stmt.run(bank.id, bank.name, bank.trainedAt.toISOString(), bank.isActive ? 1 : 0, bank.modelData ? JSON.stringify(bank.modelData) : null);
        stmt.free();
        saveDatabase();
        dataRetentionService.retainData('ml_analysis', bank, 'user_input');
        console.log('Training data bank added successfully');
    } catch (error) {
        console.error('Failed to add training data bank:', error);
        throw error;
    }
};

export const getTrainingDataBanks = async () => {
    if (!db) throw new Error('Database not initialized');
    
    try {
        const stmt = db.prepare('SELECT * FROM training_data_banks ORDER BY trainedAt DESC');
        const results = stmtResultToObject(stmt);
        return results.map((row: any) => ({
            ...row,
            trainedAt: new Date(row.trainedAt),
            isActive: Boolean(row.isActive),
            modelData: row.modelData ? JSON.parse(row.modelData) : null
        }));
    } catch (error) {
        console.error('Failed to get training data banks:', error);
        throw error;
    }
};

export const deleteTrainingDataBank = async (bankId: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
        // First delete associated training files
        const deleteFilesStmt = db.prepare('DELETE FROM training_files WHERE bankId = ?');
        deleteFilesStmt.run(bankId);
        deleteFilesStmt.free();
        
        // Then delete the bank
        const deleteBankStmt = db.prepare('DELETE FROM training_data_banks WHERE id = ?');
        deleteBankStmt.run(bankId);
        deleteBankStmt.free();
        
        saveDatabase();
        console.log('Training data bank deleted successfully');
    } catch (error) {
        console.error('Failed to delete training data bank:', error);
        throw error;
    }
};

export const addTrainingFile = async (file: { id: string; bankId: string; fileName: string; fileSize: number; fileType: string; uploadedAt: Date }) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
        const stmt = db.prepare('INSERT INTO training_files (id, bankId, fileName, fileSize, fileType, uploadedAt) VALUES (?, ?, ?, ?, ?, ?)');
        stmt.run(file.id, file.bankId, file.fileName, file.fileSize, file.fileType, file.uploadedAt.toISOString());
        stmt.free();
        saveDatabase();
        dataRetentionService.retainData('ml_analysis', file, 'user_input');
        console.log('Training file added successfully');
    } catch (error) {
        console.error('Failed to add training file:', error);
        throw error;
    }
};

export const getTrainingFiles = async (bankId?: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
        let stmt;
        if (bankId) {
            stmt = db.prepare('SELECT * FROM training_files WHERE bankId = ? ORDER BY uploadedAt DESC');
            stmt.bind(bankId);
        } else {
            stmt = db.prepare('SELECT * FROM training_files ORDER BY uploadedAt DESC');
        }
        const results = stmtResultToObject(stmt);
        return results.map((row: any) => ({
            ...row,
            uploadedAt: new Date(row.uploadedAt)
        }));
    } catch (error) {
        console.error('Failed to get training files:', error);
        throw error;
    }
};

export const deleteTrainingFile = async (fileId: string) => {
    if (!db) throw new Error('Database not initialized');
    
    try {
        const stmt = db.prepare('DELETE FROM training_files WHERE id = ?');
        stmt.run(fileId);
        stmt.free();
        saveDatabase();
        console.log('Training file deleted successfully');
    } catch (error) {
        console.error('Failed to delete training file:', error);
        throw error;
    }
};