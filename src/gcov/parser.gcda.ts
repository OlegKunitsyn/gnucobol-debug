import {IRecordParser, Arc, Block, GcnoFunction, DataInput} from './gcov';

export class GcdaRecordsParser implements IRecordParser {

    readonly GCOV_DATA_MAGIC: number = 0x67636461;
    readonly GCOV_TAG_FUNCTION: number = 0x01000000;
    readonly GCOV_COUNTER_ARCS: number = 0x01a10000;
    readonly GCOV_TAG_OBJECT_SYMMARY: number = 0xa1000000;
    readonly GCOV_TAG_PROGRAM_SUMMARY: number = 0xa3000000;
    readonly GCC_VER_900: number = 1094266922;
    private gcnoFunctions: GcnoFunction[];

    constructor(gcnoFunctions: GcnoFunction[]) {
        this.gcnoFunctions = gcnoFunctions;
    }

    public parse(stream: DataInput): void {
        let magic = 0;
        let gcnoFunction: GcnoFunction = null;
        magic = stream.readInt();

        if (magic == this.GCOV_DATA_MAGIC) {
            stream.setBigEndian();
        } else {
            magic = (magic >> 16) | (magic << 16);
            magic = ((magic & 0xff00ff) << 8) | ((magic >> 8) & 0xff00ff);
            if (magic == this.GCOV_DATA_MAGIC) {
                stream.setLittleEndian();
            } else {
                throw new Error("Unsupported format");
            }
        }

        const version = stream.readInt();
        stream.readInt();
        while (true) {
            try {
                const tag = stream.readInt();
                if (tag == 0) {
                    continue;
                }
                const length = stream.readInt();
                switch (tag) {
                    case this.GCOV_TAG_FUNCTION: {
                        const ident = stream.readInt();
                        if (this.gcnoFunctions.length > 0) {
                            for (const f of this.gcnoFunctions) {
                                if (f.ident === ident) {
                                    gcnoFunction = f;
                                    const checksum = stream.readInt();
                                    if (f.checksum !== checksum) {
                                        throw new Error("Parsing error");
                                    }
                                    if (version >= 875575082) {
                                        stream.readInt();
                                    }
                                    break;
                                }
                            }
                        }
                        break;
                    }
                    case this.GCOV_COUNTER_ARCS: {
                        if (gcnoFunction == null) {
                            throw new Error("Parsing error");
                        }
                        const blocks: Block[] = gcnoFunction.functionBlocks;
                        if (blocks.length === 0) {
                            throw new Error("Parsing error");
                        }
                        for (const block of blocks) {
                            const exitArcs: Arc[] = block.exitArcs;
                            for (const exitArc of exitArcs) {
                                if (!exitArc.isOnTree) {
                                    const arcsCount = stream.readLong();
                                    exitArc.count = arcsCount;
                                    exitArc.isValid = true;
                                    block.successCount--;
                                    exitArc.dstBlock.predictionsCount--;
                                }
                            }
                        }
                        gcnoFunction = null;
                        break;
                    }
                    case this.GCOV_TAG_OBJECT_SYMMARY: {
                        if (version >= this.GCC_VER_900) {
                            stream.readInt();
                            stream.readInt();
                        } else {
                            stream.readInt();
                            stream.readInt();
                            stream.readInt();
                            stream.readInt();
                            stream.readInt();
                            stream.readInt();
                        }
                        break;
                    }
                    case this.GCOV_TAG_PROGRAM_SUMMARY: {
                        stream.readInt();
                        stream.readInt();
                        stream.readInt();
                        for (let i = 0; i < length - 3; i++) {
                            stream.readInt();
                        }
                        break;
                    }
                    default: {
                        break;
                    }
                }
            } catch (RangeError) {
                break;
            }
        }
    }
}
