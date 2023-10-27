## 3.32.0
* Updates [Issue #138](https://github.com/OlegKunitsyn/gnucobol-debug/issues/138) by MARCOS MARTINS DUMA
  * Migrate from TSLint to ESLint
  * Update package name `vscode-debugadapter` and `debugadapter-testsupport`.
* Improvements [Issue #134](https://github.com/OlegKunitsyn/gnucobol-debug/issues/134) by MARCOS MARTINS DUMA
  * Allow viewing of variables with the `-` character in the name
  * Enable hovering on child variables
  * Display debug output in the VSCode terminal
  * Set `XTERM` variable to the correct display during debugging with the GDB TTY option
  * Utilize gdbtty for debugging on WSL and SSH (Windows -> Linux)
  * Perform `stepOver` in subroutines called by `PERFORM` statement
  * Support `stepInto`/`stepOut` in subroutines called by `PERFORM` statement
  * Run Gdbtty with Ctrl-F5
  * Provide support for symbolic link directories on linux.
* Support for newer extension ids [Issue #139](https://github.com/OlegKunitsyn/gnucobol-debug/issues/139) by Simon Sobisch
* Experimental by MARCOS MARTINS DUMA
  * format
  * remove log file
  * Set value `-` fix for Oracle Linux
  * Hover variables in GnuCOBOL31 and GnuCOBOL32.

## 2.32.1
* Debug code in a separate window [Issue #132](https://github.com/OlegKunitsyn/gnucobol-debug/issues/132)
  * via XTERM terminal on Linux
  * via new-console option on Windows
* Fix breakpoint on Windows [Issue #131](https://github.com/OlegKunitsyn/gnucobol-debug/issues/131)

## 2.31.37
* Update dependencies
* Fix badges

## 2.31.35
* Update dependencies

## 2.31.34
* Update dependencies

## 2.31.33
* Readme cleanup

## 2.31.32
* Improve compatibility with GnuCOBOL 3.1.1+ [Issue #97](https://github.com/OlegKunitsyn/gnucobol-debug/issues/97)

## 2.31.31
* Improve debugging on Windows using Trembley's packages [Issue #29](https://github.com/OlegKunitsyn/gnucobol-debug/issues/29)

## 2.31.30
* Code cleanup

## 2.31.28
* Fix debugging via Docker on Windows [Issue #89](https://github.com/OlegKunitsyn/gnucobol-debug/issues/89) by Aaron Paterson

## 2.31.27
* Toggable details view [Issue #66](https://github.com/OlegKunitsyn/gnucobol-debug/issues/66) by Bruno Pacheco
* Docker image selection [Issue #82](https://github.com/OlegKunitsyn/gnucobol-debug/issues/82)
* Breaking changes in `launch.json`:
  - `targetargs` property renamed to `arguments`, nullable by default
  - `container` property renamed to `docker`, set to `olegkunitsyn/gnucobol:3.1-dev` by default

## 1.31.26
* Support for setting data storages and field values on GC 2.2 [Issue #40](https://github.com/OlegKunitsyn/gnucobol-debug/issues/40)

## 1.31.25
* Fix failed tests [Issue #71](https://github.com/OlegKunitsyn/gnucobol-debug/issues/71)
* Fix WATCH [Issue #62](https://github.com/OlegKunitsyn/gnucobol-debug/issues/62)
* Fix validating cwd before launching the debugger [Issue #67](https://github.com/OlegKunitsyn/gnucobol-debug/issues/67)
* Support for setting values on variables (GC 3.1 only) [Issue #40](https://github.com/OlegKunitsyn/gnucobol-debug/issues/40)

## 1.31.24
* Implement attaching to a remote gdbserver [Issue #3](https://github.com/OlegKunitsyn/gnucobol-debug/issues/3) by Bruno Pacheco
* Implement support of USAGE [Issue #59](https://github.com/OlegKunitsyn/gnucobol-debug/issues/59) by Bruno Pacheco

## 1.31.23
* Implement attaching to a running process [Issue #3](https://github.com/OlegKunitsyn/gnucobol-debug/issues/3) by Bruno Pacheco

## 0.31.22
* Fix malformed linespec error [Issue #53](https://github.com/OlegKunitsyn/gnucobol-debug/issues/53) by Bruno Pacheco
* Remove call of cob_display [Issue #54](https://github.com/OlegKunitsyn/gnucobol-debug/issues/54) by Bruno Pacheco

## 0.31.21
* Implement expressions in Watch pane [Issue #44](https://github.com/OlegKunitsyn/gnucobol-debug/issues/44) by Bruno Pacheco

## 0.31.20
* Fix parsing values from GC to Debugger [Issue #35](https://github.com/OlegKunitsyn/gnucobol-debug/issues/35)

## 0.31.19
* Fix watching of the value [Issue #35](https://github.com/OlegKunitsyn/gnucobol-debug/issues/35)

## 0.31.18
* Fix C parsing on Windows [Issue #32](https://github.com/OlegKunitsyn/gnucobol-debug/issues/32)

## 0.31.17
* Fix numerical fields in Variables pane. [Issue #30](https://github.com/OlegKunitsyn/gnucobol-debug/issues/30) by Bruno Pacheco
* Implement start/stop commands for GnuCOBOL Docker

## 0.31.16
* Show field's data instead of data. [Issue #4](https://github.com/OlegKunitsyn/gnucobol-debug/issues/4) by Bruno Pacheco
* Compatibility with GnuCOBOL 3.1

## 0.22.15
* Support [GnuCOBOL Docker image](https://hub.docker.com/repository/docker/olegkunitsyn/gnucobol)

## 0.22.14
* Fix failing on non-empty `cobc` output. [Issue #25](https://github.com/OlegKunitsyn/gnucobol-debug/issues/25)
* Implement Code Coverage. [Issue #23](https://github.com/OlegKunitsyn/gnucobol-debug/issues/23)

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
