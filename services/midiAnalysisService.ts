export interface MIDIAnalysis {
    instruments: { [key: string]: number };
    genres: { [key: string]: number };
    tempos: { [key: string]: number };
    keys: { [key: string]: number };
    timeSignatures: { [key: string]: number };
    fileCategories: { [key: string]: string[] };
    totalFiles: number;
    averageTempo: number;
    mostCommonInstrument: string;
    mostCommonGenre: string;
    learningGaps: string[];
    recommendations: string[];
}

class MIDIAnalysisService {
    private instrumentMap: { [key: number]: string } = {
        0: 'Acoustic Grand Piano',
        1: 'Bright Acoustic Piano',
        2: 'Electric Grand Piano',
        3: 'Honky-tonk Piano',
        4: 'Electric Piano 1',
        5: 'Electric Piano 2',
        6: 'Harpsichord',
        7: 'Clavi',
        8: 'Celesta',
        9: 'Glockenspiel',
        10: 'Music Box',
        11: 'Vibraphone',
        12: 'Marimba',
        13: 'Xylophone',
        14: 'Tubular Bells',
        15: 'Dulcimer',
        16: 'Drawbar Organ',
        17: 'Percussive Organ',
        18: 'Rock Organ',
        19: 'Church Organ',
        20: 'Reed Organ',
        21: 'Accordion',
        22: 'Harmonica',
        23: 'Tango Accordion',
        24: 'Acoustic Guitar (nylon)',
        25: 'Acoustic Guitar (steel)',
        26: 'Electric Guitar (jazz)',
        27: 'Electric Guitar (clean)',
        28: 'Electric Guitar (muted)',
        29: 'Overdriven Guitar',
        30: 'Distortion Guitar',
        31: 'Guitar Harmonics',
        32: 'Acoustic Bass',
        33: 'Electric Bass (finger)',
        34: 'Electric Bass (pick)',
        35: 'Fretless Bass',
        36: 'Slap Bass 1',
        37: 'Slap Bass 2',
        38: 'Synth Bass 1',
        39: 'Synth Bass 2',
        40: 'Violin',
        41: 'Viola',
        42: 'Cello',
        43: 'Contrabass',
        44: 'Tremolo Strings',
        45: 'Pizzicato Strings',
        46: 'Orchestral Harp',
        47: 'Timpani',
        48: 'String Ensemble 1',
        49: 'String Ensemble 2',
        50: 'Synth Strings 1',
        51: 'Synth Strings 2',
        52: 'Choir Aahs',
        53: 'Voice Oohs',
        54: 'Synth Voice',
        55: 'Orchestra Hit',
        56: 'Trumpet',
        57: 'Trombone',
        58: 'Tuba',
        59: 'Muted Trumpet',
        60: 'French Horn',
        61: 'Brass Section',
        62: 'Synth Brass 1',
        63: 'Synth Brass 2',
        64: 'Soprano Sax',
        65: 'Alto Sax',
        66: 'Tenor Sax',
        67: 'Baritone Sax',
        68: 'Oboe',
        69: 'English Horn',
        70: 'Bassoon',
        71: 'Clarinet',
        72: 'Piccolo',
        73: 'Flute',
        74: 'Recorder',
        75: 'Pan Flute',
        76: 'Blown Bottle',
        77: 'Shakuhachi',
        78: 'Whistle',
        79: 'Ocarina',
        80: 'Lead 1 (square)',
        81: 'Lead 2 (sawtooth)',
        82: 'Lead 3 (calliope)',
        83: 'Lead 4 (chiff)',
        84: 'Lead 5 (charang)',
        85: 'Lead 6 (voice)',
        86: 'Lead 7 (fifths)',
        87: 'Lead 8 (bass + lead)',
        88: 'Pad 1 (new age)',
        89: 'Pad 2 (warm)',
        90: 'Pad 3 (polysynth)',
        91: 'Pad 4 (choir)',
        92: 'Pad 5 (bowed)',
        93: 'Pad 6 (metallic)',
        94: 'Pad 7 (halo)',
        95: 'Pad 8 (sweep)',
        96: 'FX 1 (rain)',
        97: 'FX 2 (soundtrack)',
        98: 'FX 3 (crystal)',
        99: 'FX 4 (atmosphere)',
        100: 'FX 5 (brightness)',
        101: 'FX 6 (goblins)',
        102: 'FX 7 (echoes)',
        103: 'FX 8 (sci-fi)',
        104: 'Sitar',
        105: 'Banjo',
        106: 'Shamisen',
        107: 'Koto',
        108: 'Kalimba',
        109: 'Bag pipe',
        110: 'Fiddle',
        111: 'Shanai',
        112: 'Tinkle Bell',
        113: 'Agogo',
        114: 'Steel Drums',
        115: 'Woodblock',
        116: 'Taiko Drum',
        117: 'Melodic Tom',
        118: 'Synth Drum',
        119: 'Reverse Cymbal',
        120: 'Guitar Fret Noise',
        121: 'Breath Noise',
        122: 'Seashore',
        123: 'Bird Tweet',
        124: 'Telephone Ring',
        125: 'Helicopter',
        126: 'Applause',
        127: 'Gunshot'
    };

    private genreKeywords: { [key: string]: string[] } = {
        'Jazz': ['jazz', 'swing', 'blues', 'bebop', 'fusion', 'smooth', 'lounge'],
        'Classical': ['classical', 'symphony', 'orchestra', 'chamber', 'concerto', 'sonata', 'fugue'],
        'Rock': ['rock', 'metal', 'punk', 'grunge', 'alternative', 'indie', 'garage'],
        'Electronic': ['electronic', 'techno', 'house', 'trance', 'ambient', 'synth', 'dance', 'edm'],
        'Pop': ['pop', 'mainstream', 'radio', 'hit', 'chart', 'commercial'],
        'Funk': ['funk', 'disco', 'soul', 'r&b', 'motown'],
        'Latin': ['latin', 'salsa', 'bossa', 'samba', 'tango', 'flamenco', 'samba'],
        'Country': ['country', 'folk', 'bluegrass', 'western', 'americana'],
        'Hip-Hop': ['hip', 'hop', 'rap', 'urban', 'trap', 'drill'],
        'Reggae': ['reggae', 'ska', 'dub', 'dancehall'],
        'World': ['world', 'ethnic', 'traditional', 'cultural', 'tribal']
    };

    private tempoCategories: { [key: string]: { min: number; max: number } } = {
        'Very Slow': { min: 40, max: 60 },
        'Slow': { min: 60, max: 80 },
        'Moderate': { min: 80, max: 100 },
        'Medium': { min: 100, max: 120 },
        'Fast': { min: 120, max: 140 },
        'Very Fast': { min: 140, max: 200 }
    };

    public async analyzeMIDIFiles(files: File[]): Promise<MIDIAnalysis> {
        const analysis: MIDIAnalysis = {
            instruments: {},
            genres: {},
            tempos: {},
            keys: {},
            timeSignatures: {},
            fileCategories: {},
            totalFiles: files.length,
            averageTempo: 0,
            mostCommonInstrument: '',
            mostCommonGenre: '',
            learningGaps: [],
            recommendations: []
        };

        let totalTempo = 0;
        let tempoCount = 0;

        for (const file of files) {
            try {
                const fileAnalysis = await this.analyzeSingleMIDI(file);
                
                // Aggregate instruments
                Object.entries(fileAnalysis.instruments).forEach(([instrument, count]) => {
                    analysis.instruments[instrument] = (analysis.instruments[instrument] || 0) + count;
                });

                // Aggregate genres
                Object.entries(fileAnalysis.genres).forEach(([genre, count]) => {
                    analysis.genres[genre] = (analysis.genres[genre] || 0) + count;
                });

                // Aggregate tempos
                Object.entries(fileAnalysis.tempos).forEach(([tempo, count]) => {
                    analysis.tempos[tempo] = (analysis.tempos[tempo] || 0) + count;
                });

                // Aggregate keys
                Object.entries(fileAnalysis.keys).forEach(([key, count]) => {
                    analysis.keys[key] = (analysis.keys[key] || 0) + count;
                });

                // Aggregate time signatures
                Object.entries(fileAnalysis.timeSignatures).forEach(([timeSig, count]) => {
                    analysis.timeSignatures[timeSig] = (analysis.timeSignatures[timeSig] || 0) + count;
                });

                // Categorize files
                const category = this.categorizeFile(file.name, fileAnalysis);
                if (!analysis.fileCategories[category]) {
                    analysis.fileCategories[category] = [];
                }
                analysis.fileCategories[category].push(file.name);

                totalTempo += fileAnalysis.averageTempo;
                tempoCount++;

            } catch (error) {
                console.error(`Failed to analyze ${file.name}:`, error);
            }
        }

        // Calculate averages and find most common
        analysis.averageTempo = tempoCount > 0 ? totalTempo / tempoCount : 0;
        analysis.mostCommonInstrument = this.findMostCommon(analysis.instruments);
        analysis.mostCommonGenre = this.findMostCommon(analysis.genres);

        // Generate learning gaps and recommendations
        analysis.learningGaps = this.identifyLearningGaps(analysis);
        analysis.recommendations = this.generateRecommendations(analysis);

        return analysis;
    }

    private async analyzeSingleMIDI(file: File): Promise<any> {
        // This is a simplified analysis - in a real implementation, you'd parse the MIDI file
        // For now, we'll extract information from the filename and simulate analysis
        
        const fileName = file.name.toLowerCase();
        const analysis = {
            instruments: {} as { [key: string]: number },
            genres: {} as { [key: string]: number },
            tempos: {} as { [key: string]: number },
            keys: {} as { [key: string]: number },
            timeSignatures: {} as { [key: string]: number },
            averageTempo: 120
        };

        // Extract genre from filename
        for (const [genre, keywords] of Object.entries(this.genreKeywords)) {
            if (keywords.some(keyword => fileName.includes(keyword))) {
                analysis.genres[genre] = 1;
            }
        }

        // Default genre if none found
        if (Object.keys(analysis.genres).length === 0) {
            analysis.genres['Unknown'] = 1;
        }

        // Extract instruments from filename
        const instrumentKeywords = [
            'piano', 'guitar', 'bass', 'drums', 'sax', 'trumpet', 'violin', 'flute', 'organ', 'synth'
        ];
        
        for (const keyword of instrumentKeywords) {
            if (fileName.includes(keyword)) {
                analysis.instruments[this.mapKeywordToInstrument(keyword)] = 1;
            }
        }

        // Default instruments if none found
        if (Object.keys(analysis.instruments).length === 0) {
            analysis.instruments['Piano'] = 1;
        }

        // Extract tempo from filename (look for numbers that could be BPM)
        const tempoMatch = fileName.match(/(\d{2,3})bpm|(\d{2,3})\s*bpm|bpm\s*(\d{2,3})/i);
        if (tempoMatch) {
            const tempo = parseInt(tempoMatch[1] || tempoMatch[2] || tempoMatch[3]);
            if (tempo >= 40 && tempo <= 200) {
                analysis.averageTempo = tempo;
                const tempoCategory = this.categorizeTempo(tempo);
                analysis.tempos[tempoCategory] = 1;
            }
        } else {
            // Default tempo category
            analysis.tempos['Medium'] = 1;
        }

        // Extract key from filename
        const keyMatch = fileName.match(/([A-G][#b]?[m]?)\s*(major|minor)?/i);
        if (keyMatch) {
            analysis.keys[keyMatch[1]] = 1;
        } else {
            analysis.keys['C'] = 1; // Default key
        }

        // Default time signature
        analysis.timeSignatures['4/4'] = 1;

        return analysis;
    }

    private mapKeywordToInstrument(keyword: string): string {
        const mapping: { [key: string]: string } = {
            'piano': 'Piano',
            'guitar': 'Guitar',
            'bass': 'Bass',
            'drums': 'Drums',
            'sax': 'Saxophone',
            'trumpet': 'Trumpet',
            'violin': 'Violin',
            'flute': 'Flute',
            'organ': 'Organ',
            'synth': 'Synthesizer'
        };
        return mapping[keyword] || 'Unknown';
    }

    private categorizeFile(fileName: string, analysis: any): string {
        const name = fileName.toLowerCase();
        
        // Check for specific categories
        if (name.includes('jazz') || name.includes('swing')) return 'Jazz';
        if (name.includes('classical') || name.includes('orchestra')) return 'Classical';
        if (name.includes('rock') || name.includes('metal')) return 'Rock';
        if (name.includes('electronic') || name.includes('techno')) return 'Electronic';
        if (name.includes('pop') || name.includes('mainstream')) return 'Pop';
        if (name.includes('funk') || name.includes('disco')) return 'Funk';
        if (name.includes('latin') || name.includes('salsa')) return 'Latin';
        if (name.includes('country') || name.includes('folk')) return 'Country';
        if (name.includes('hip') || name.includes('rap')) return 'Hip-Hop';
        if (name.includes('reggae') || name.includes('ska')) return 'Reggae';
        
        // Default category
        return 'General';
    }

    private categorizeTempo(tempo: number): string {
        for (const [category, range] of Object.entries(this.tempoCategories)) {
            if (tempo >= range.min && tempo <= range.max) {
                return category;
            }
        }
        return 'Unknown';
    }

    private findMostCommon(obj: { [key: string]: number }): string {
        let maxCount = 0;
        let mostCommon = '';
        
        for (const [key, count] of Object.entries(obj)) {
            if (count > maxCount) {
                maxCount = count;
                mostCommon = key;
            }
        }
        
        return mostCommon || 'None';
    }

    private identifyLearningGaps(analysis: MIDIAnalysis): string[] {
        const gaps: string[] = [];
        
        // Check for missing common instruments
        const commonInstruments = ['Piano', 'Guitar', 'Bass', 'Drums', 'Saxophone', 'Trumpet'];
        for (const instrument of commonInstruments) {
            if (!analysis.instruments[instrument]) {
                gaps.push(`Missing ${instrument} training data`);
            }
        }

        // Check for tempo diversity
        const tempoCategories = Object.keys(analysis.tempos);
        if (tempoCategories.length < 3) {
            gaps.push('Limited tempo diversity - add more varied BPM ranges');
        }

        // Check for genre diversity
        const genreCount = Object.keys(analysis.genres).length;
        if (genreCount < 3) {
            gaps.push('Limited genre diversity - add more musical styles');
        }

        // Check for key diversity
        const keyCount = Object.keys(analysis.keys).length;
        if (keyCount < 5) {
            gaps.push('Limited key diversity - add more key signatures');
        }

        return gaps;
    }

    private generateRecommendations(analysis: MIDIAnalysis): string[] {
        const recommendations: string[] = [];
        
        // Instrument recommendations
        const topInstruments = Object.entries(analysis.instruments)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([instrument]) => instrument);
        
        if (topInstruments.length > 0) {
            recommendations.push(`Strong in: ${topInstruments.join(', ')}`);
        }

        // Genre recommendations
        const topGenres = Object.entries(analysis.genres)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([genre]) => genre);
        
        if (topGenres.length > 0) {
            recommendations.push(`Primary genres: ${topGenres.join(', ')}`);
        }

        // Tempo recommendations
        const avgTempo = analysis.averageTempo;
        if (avgTempo < 80) {
            recommendations.push('Consider adding faster tempo training data');
        } else if (avgTempo > 140) {
            recommendations.push('Consider adding slower tempo training data');
        }

        // File count recommendations
        if (analysis.totalFiles < 10) {
            recommendations.push('Add more training files for better model performance');
        } else if (analysis.totalFiles > 50) {
            recommendations.push('Good training data size - consider organizing into specialized banks');
        }

        return recommendations;
    }
}

export const midiAnalysisService = new MIDIAnalysisService();
