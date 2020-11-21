import {IRecordParser, SourceFile, Block, Arc, GcnoFunction, DataInput} from './gcov';

export class GcnoRecordsParser implements IRecordParser {

    readonly GCOV_NOTE_MAGIC: number = 0x67636e6f;
    readonly GCOV_TAG_FUNCTION: number = 0x01000000;
    readonly GCOV_TAG_BLOCKS: number = 0x01410000;
    readonly GCOV_TAG_ARCS: number = 0x01430000;
    readonly GCOV_TAG_LINES: number = 0x01450000;
    readonly GCC_VER_810: number = 1094201642;
    readonly GCC_VER_910: number = 1094267178;
    readonly GCC_VER_407: number = 875575082; // GCC 4.0.7
    private gcnoFunction: GcnoFunction = null;
    private gcnoFunctions: GcnoFunction[] = [];
    private sources: SourceFile[];
    private sourceMap: Map<String, SourceFile>;

    constructor(sourceMap: Map<String, SourceFile>, sources: SourceFile[]) {
        this.sourceMap = sourceMap;
        this.sources = sources;
    }

    public parse(stream: DataInput): void {
        let magic = 0;
        let blocks: Block[] = null;
        let source: SourceFile = null;
        let parseFirstFunction: boolean = false;

        magic = stream.readInt();
        if (magic == this.GCOV_NOTE_MAGIC) {
            stream.setBigEndian();
        } else {
            magic = (magic >> 16) | (magic << 16);
            magic = ((magic & 0xff00ff) << 8) | ((magic >> 8) & 0xff00ff);
            if (magic == this.GCOV_NOTE_MAGIC) {
                stream.setLittleEndian();
            } else {
                throw new Error("Unsupported format");
            }
        }

        const version = stream.readInt();
        stream.readInt();
        while (true) {
            try {
                let tag;
                while (true) {
                    tag = stream.readInt();
                    if (tag == this.GCOV_TAG_FUNCTION || tag == this.GCOV_TAG_BLOCKS || tag == this.GCOV_TAG_ARCS || tag == this.GCOV_TAG_LINES)
                        break;
                }
                let length = stream.readInt();
                switch (tag) {
                    case this.GCOV_TAG_FUNCTION:
                        if (parseFirstFunction) {
                            this.gcnoFunctions.push(this.gcnoFunction);
                        }
                        const ident = stream.readInt();
                        const checksum = stream.readInt();
                        if (version >= this.GCC_VER_407) {
                            stream.readInt();
                        }
                        const name = stream.readString();
                        if (version >= this.GCC_VER_810) {
                            stream.readInt();
                        }
                        const srcFile = stream.readString();
                        const firstLineNumber = stream.readInt();
                        if (version >= this.GCC_VER_810) {
                            stream.readInt();
                            stream.readInt();
                        }
                        if (version >= this.GCC_VER_910) {
                            stream.readInt();
                        }
                        this.gcnoFunction = new GcnoFunction(ident, checksum, srcFile, firstLineNumber);
                        const file = this.findOrAdd(this.gcnoFunction.srcFile);
                        if (this.gcnoFunction.firstLineNumber >= file.linesCount) {
                            file.linesCount = this.gcnoFunction.firstLineNumber + 1;
                        }
                        file.functions.add(this.gcnoFunction);
                        parseFirstFunction = true;
                        break;
                    case this.GCOV_TAG_BLOCKS:
                        if (version >= this.GCC_VER_810) {
                            length = stream.readInt();
                        }
                        blocks = [];
                        for (let i = 0; i < length; i++) {
                            if (version < this.GCC_VER_810) {
                                stream.readInt();
                            }
                            blocks.push(new Block());
                        }
                        break;
                    case this.GCOV_TAG_ARCS:
                        const srcBlockIdx = stream.readInt();
                        const block = blocks[srcBlockIdx];
                        const arcs: Arc[] = [];
                        for (let i = 0; i < (length - 1) / 2; i++) {
                            const dstBlockIdx = stream.readInt();
                            const flag = stream.readInt();
                            const arc = new Arc(srcBlockIdx, dstBlockIdx, flag, blocks);
                            arc.dstBlock.entryArcs.push(arc);
                            arc.dstBlock.predictionsCount++;
                            arcs.push(arc);
                            block.exitArcs.push(arc);
                            block.successCount++;
                        }
                        this.gcnoFunction.functionBlocks = blocks;
                        break;
                    case this.GCOV_TAG_LINES:
                        const blockNumber = stream.readInt();
                        const lineNumbers: number[] = [];
                        while (true) {
                            const lineNumber = stream.readInt();
                            if (lineNumber == 0) {
                                const fileName = stream.readString();
                                if (fileName === "") {
                                    break;
                                }
                                source = this.findOrAdd(fileName);
                            } else {
                                lineNumbers.push(lineNumber);
                                if (lineNumber >= source.linesCount) {
                                    source.linesCount = lineNumber + 1;
                                }
                            }
                        }
                        this.gcnoFunction.functionBlocks[blockNumber].lineNumbers = lineNumbers;
                        this.gcnoFunction.functionBlocks[blockNumber].sourceIndex = source.index;
                        break;
                    default: {
                        break;
                    }
                }
            } catch (RangeException) {
                this.gcnoFunction.functionBlocks = blocks;
                this.gcnoFunctions.push(this.gcnoFunction);
                break;
            }
        }
    }

    public getFunctions(): GcnoFunction[] {
        return this.gcnoFunctions;
    }

    private findOrAdd(fileName: string): SourceFile {
        let sourceFile = this.sourceMap.get(fileName);
        if (sourceFile == null) {
            sourceFile = new SourceFile(fileName, this.sources.length + 1);
            this.sources.push(sourceFile);
            this.sourceMap.set(fileName, sourceFile);
        }
        return sourceFile;
    }
}
