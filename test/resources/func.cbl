       IDENTIFICATION DIVISION.
       PROGRAM-ID. func.
       ENVIRONMENT DIVISION.
       CONFIGURATION SECTION.
       REPOSITORY.
           FUNCTION dvd
           FUNCTION mlp.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
           01 argA PIC S9(2)V9(2) VALUE 10.
           01 argB PIC S9(2)V9(2) VALUE 3.
       PROCEDURE DIVISION.
           DISPLAY "Division: " dvd(argA, argB).
           DISPLAY "Multiplication: " mlp(argA, argB).
           STOP RUN.
       END PROGRAM func.

       IDENTIFICATION DIVISION.
       FUNCTION-ID. dvd.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       LINKAGE SECTION.
           01 dividend PIC S9(2)V9(2).
           01 divisor PIC S9(2)V9(2).
           01 quotient PIC S9(2)V9(2).
       PROCEDURE DIVISION USING dividend, divisor RETURNING quotient.
           COMPUTE quotient = dividend / divisor.
       END FUNCTION dvd.

       IDENTIFICATION DIVISION.
       FUNCTION-ID. mlp.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       LINKAGE SECTION.
           01 argA PIC S9(2)V9(2).
           01 argB PIC S9(2)V9(2).
           01 result PIC S9(2)V9(2).
       PROCEDURE DIVISION USING argA, argB RETURNING result.
           COMPUTE result = argA * argB.
       END FUNCTION mlp.
