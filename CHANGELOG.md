## 0.22.13
* Fix `Step Over` in CALL execution. [Issue #21](https://github.com/OlegKunitsyn/gnucobol-debug/issues/21)

## 0.22.12
* Fix `Step Over` in the end of a function call. [Issue #17](https://github.com/OlegKunitsyn/gnucobol-debug/issues/17)

## 0.22.11
* Fix source-map creation on the paths with spaces. [Issue #16](https://github.com/OlegKunitsyn/gnucobol-debug/issues/16)
* Remove default compilation arguments `-d` and `-fdebugging-line`. [Issue #10](https://github.com/OlegKunitsyn/gnucobol-debug/issues/10)
* Confirmed compatibility with `cobc` 3.1. [Issue #1](https://github.com/OlegKunitsyn/gnucobol-debug/issues/1)

## 0.22.10
* Implement `Step Over`, `Step Into`, `Step Out` breakpoint-actions

## 0.22.9
* Implement `targetargs` property in `launch.json`. [Issue #12](https://github.com/OlegKunitsyn/gnucobol-debug/issues/12)
* Fix hidden stdout. [Issue #15](https://github.com/OlegKunitsyn/gnucobol-debug/issues/15)
* Fix console input in debug mode. [Issue #8](https://github.com/OlegKunitsyn/gnucobol-debug/issues/8)
* Update versioning scheme to `<X><GnuCOBOL X.Y><Z>`

## 0.8.22
* Fix default `cobcargs`

## 0.7.22
* Add COBOL dialects such as `COBOL`, `ACUCOBOL`, `OpenCOBOL`, `GnuCOBOL`, `entcobol`. [Issue #10](https://github.com/OlegKunitsyn/gnucobol-debug/issues/10)
* Implement `cobcargs` property in `launch.json`. [Issue #10](https://github.com/OlegKunitsyn/gnucobol-debug/issues/10)

## 0.6.22
* Fix breakpoints in the Compilation Group
* Add tests

## 0.5.22
* Contrast icon

## 0.4.22
* Implement validation of the target file
* Fix SourceMap locations

## 0.3.22
* Implement execution of COBOL program `CTRL+F5`
* Implement debugging of COBOL program `F5`
