       IDENTIFICATION DIVISION.
       PROGRAM-ID. anothersample.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01 WS-SMALL PIC X(2) VALUE '01'.
       01 WS-BIG PIC X(10) VALUE '0123456789'.
       PROCEDURE DIVISION.
           DISPLAY "Hello".
           CALL 'anothersubsample' USING BY CONTENT WS-SMALL
           END-CALL.
           CALL 'anothersubsample' USING BY CONTENT WS-BIG
           END-CALL.
           DISPLAY "World"
           STOP RUN.
