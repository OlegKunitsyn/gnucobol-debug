#line 1 "/home/olegs/projects/gnucobol-debug/test/resources/hello3.cbl"
 IDENTIFICATION DIVISION.
 PROGRAM-ID. hello3.
 DATA DIVISION.
 WORKING-STORAGE SECTION.
 01 MYVAR PIC X(5).
 PROCEDURE DIVISION.
 MOVE "World" TO MYVAR
 DISPLAY "Hello " MYVAR.
 STOP RUN.
