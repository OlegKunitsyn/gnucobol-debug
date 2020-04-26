       IDENTIFICATION DIVISION.
       PROGRAM-ID. helloinput.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  ANSWER PIC X(8).
       PROCEDURE DIVISION.
           DISPLAY 'What is your name?'.
           ACCEPT ANSWER.
           DISPLAY 'Hello, ', ANSWER.
           STOP RUN.
