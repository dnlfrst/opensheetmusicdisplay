import {SourceMusicPart} from "./SourceMusicPart";
import {SourceMeasure} from "../VoiceData/SourceMeasure";
import {Fraction} from "../../Common/DataObjects/fraction";
import {MusicSheet} from "../MusicSheet";
import {RepetitionInstruction} from "../VoiceData/Instructions/RepetitionInstruction";
import {PartListEntry} from "./PartListEntry";
import {Logging} from "../../Common/Logging";

export class Repetition extends PartListEntry /*implements IRepetition*/ {
    constructor(musicSheet: MusicSheet, virtualOverallRepetition: boolean) {
        super(musicSheet);
        this.musicSheet2 = musicSheet;
        this.virtualOverallRepetition = virtualOverallRepetition;
    }

    public startMarker: RepetitionInstruction;
    public endMarker: RepetitionInstruction;
    public forwardJumpInstruction: RepetitionInstruction;

    private backwardJumpInstructions: RepetitionInstruction[] = [];
    private endingParts: RepetitionEndingPart[] = [];
    private endingIndexDict: { [_: number]: RepetitionEndingPart; } = {};
    private userNumberOfRepetitions: number = 0;
    private visibles: boolean[] = [];
    private fromWords: boolean = false;
    private musicSheet2: MusicSheet;
    private repetitonIterationOrder: number[] = [];
    private numberOfEndings: number = 1;
    private virtualOverallRepetition: boolean;

    public get BackwardJumpInstructions(): RepetitionInstruction[] {
        return this.backwardJumpInstructions;
    }
    public get EndingIndexDict(): { [_: number]: RepetitionEndingPart; } {
        return this.endingIndexDict;
    }
    public get EndingParts(): RepetitionEndingPart[] {
        return this.endingParts;
    }
    public get Visibles(): boolean[] {
        return this.visibles;
    }
    public set Visibles(value: boolean[]) {
        this.visibles = value;
    }
    public get DefaultNumberOfRepetitions(): number {
        let defaultNumber: number = 2;
        if (this.virtualOverallRepetition) { defaultNumber = 1; }
        return Math.max(defaultNumber, Object.keys(this.endingIndexDict).length, this.checkRepetitionForMultipleLyricVerses());
    }
    public get UserNumberOfRepetitions(): number {
        return this.userNumberOfRepetitions;
    }
    public set UserNumberOfRepetitions(value: number) {
        this.userNumberOfRepetitions = value;
        this.repetitonIterationOrder = [];
        let endingsDiff: number = this.userNumberOfRepetitions - this.NumberOfEndings;
        for (let i: number = 1; i <= this.userNumberOfRepetitions; i++) {
            if (i <= endingsDiff) {
                this.repetitonIterationOrder.push(1);
            } else {
                this.repetitonIterationOrder.push(i - endingsDiff);
            }
        }
    }
    public getForwardJumpTargetForIteration(iteration: number): number {
        let endingIndex: number = this.repetitonIterationOrder[iteration - 1];
        if (this.endingIndexDict[endingIndex] !== undefined) {
            return this.endingIndexDict[endingIndex].part.StartIndex;
        }
        return -1;
    }
    public getBackwardJumpTarget(): number {
        return this.startMarker.measureIndex;
    }
    public SetEndingStartIndex(endingNumbers: number[], startIndex: number): void {
        let part: RepetitionEndingPart = new RepetitionEndingPart(new SourceMusicPart(this.musicSheet2, startIndex, startIndex));
        this.endingParts.push(part);
        for (let endingNumber of endingNumbers) {
            try {
                this.endingIndexDict[endingNumber] = part;
                part.endingIndices.push(endingNumber);
                if (this.numberOfEndings < endingNumber) {
                    this.numberOfEndings = endingNumber;
                }
            } catch (err) {
                Logging.error("Repetition: Exception.", err);
            }

        }
    }
    //public SetEndingStartIndex(endingNumber: number, startIndex: number): void {
    //    let part: RepetitionEndingPart = new RepetitionEndingPart(new SourceMusicPart(this.musicSheet2, startIndex, startIndex));
    //    this.endingParts.push(part);
    //    this.endingIndexDict[endingNumber] = part;
    //    part.endingIndices.push(endingNumber);
    //    if (this.numberOfEndings < endingNumber) {
    //        this.numberOfEndings = endingNumber;
    //    }
    //}
    public setEndingEndIndex(endingNumber: number, endIndex: number): void {
        if (this.endingIndexDict[endingNumber] !== undefined) {
            this.endingIndexDict[endingNumber].part.setEndIndex(endIndex);
        }
    }
    public get NumberOfEndings(): number {
        return this.numberOfEndings;
    }
    public get FromWords(): boolean {
        return this.fromWords;
    }
    public set FromWords(value: boolean) {
        this.fromWords = value;
    }
    public get AbsoluteTimestamp(): Fraction {
        return Fraction.createFromFraction(this.musicSheet2.SourceMeasures[this.startMarker.measureIndex].AbsoluteTimestamp);
    }
    public get StartIndex(): number {
        return this.startMarker.measureIndex;
    }
    public get EndIndex(): number {
        if (this.BackwardJumpInstructions.length === 0) {
            return this.StartIndex;
        }
        let result: number = this.backwardJumpInstructions[this.backwardJumpInstructions.length - 1].measureIndex;
        if (this.endingIndexDict[this.NumberOfEndings] !== undefined) {
            result = Math.max(this.endingIndexDict[this.NumberOfEndings].part.EndIndex, result);
        }
        return result;
    }
    private checkRepetitionForMultipleLyricVerses(): number {
        let lyricVerses: number = 0;
        let start: number = this.StartIndex;
        let end: number = this.EndIndex;
        for (let measureIndex: number = start; measureIndex <= end; measureIndex++) {
            let sourceMeasure: SourceMeasure = this.musicSheet2.SourceMeasures[measureIndex];
            for (let i: number = 0; i < sourceMeasure.CompleteNumberOfStaves; i++) {
                for (let sourceStaffEntry of sourceMeasure.VerticalSourceStaffEntryContainers[i].StaffEntries) {
                    if (sourceStaffEntry !== undefined) {
                        let verses: number = 0;
                        for (let voiceEntry of sourceStaffEntry.VoiceEntries) {
                            verses += Object.keys(voiceEntry.LyricsEntries).length;
                        }
                        lyricVerses = Math.max(lyricVerses, verses);
                    }
                }
            }
        }
        return lyricVerses;
    }
    public get FirstSourceMeasureNumber(): number {
        return this.getFirstSourceMeasure().MeasureNumber;
    }
    public get LastSourceMeasureNumber(): number {
        return this.getLastSourceMeasure().MeasureNumber;
    }

}

export class RepetitionEndingPart {
    constructor(endingPart: SourceMusicPart) {
        this.part = endingPart;
    }
    public part: SourceMusicPart;
    public endingIndices: number[] = [];
    public ToString(): string {
      return this.endingIndices.join(", ");
    }
}