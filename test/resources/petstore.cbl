       IDENTIFICATION DIVISION.
       PROGRAM-ID. PETSTORE.
       AUTHOR. BRUNO PACHECO.
       DATA DIVISION.
       WORKING-STORAGE SECTION.
       01  WS-ITEM OCCURS 100 TIMES INDEXED BY I.
           05  ITEM-DESCRIPTION PIC X(16).
           05  ITEM-PRICE       PIC 999V99.
           05  ITEM-QUANTITY    PIC 999.
           05  ITEM-COST        PIC 999V99.

       01  WS-BILL.
           05  TOTAL-QUANTITY          PIC 999 VALUE ZEROES.
           05  TOTAL-COST              PIC 99999V99 VALUE ZEROES.
           05  TOTAL-COST-DISCOUNTED   PIC 99999V99 VALUE ZEROES.

       01  WS-CONTROL.
           05  J                       PIC 999 VALUE 1.
           05  DISCOUNT                PIC V9  VALUE .8.
           05  MINIMUM-FOR-DISCOUNT    PIC 999 VALUE 100.
           05  USER-ANSWER             PIC A.
               88  DONE                VALUE 'N'.

       01  HEADING-LINE1.
            05 FILLER  PIC X(16) VALUE 'PRODUCT'.
            05 FILLER  PIC X(2) VALUE SPACES.
            05 FILLER  PIC X(10) VALUE 'PRICE'.
            05 FILLER  PIC X(2) VALUE SPACES.
            05 FILLER  PIC X(8) VALUE 'QUANTITY'.
            05 FILLER  PIC X(2) VALUE SPACES.
            05 FILLER  PIC X(10) VALUE 'COST'.

       01  HEADING-LINE2.
            05 FILLER  PIC X(16) VALUE '================'.
            05 FILLER  PIC X(2) VALUE SPACES.
            05 FILLER  PIC X(10) VALUE '=========='.
            05 FILLER  PIC X(2) VALUE SPACES.
            05 FILLER  PIC X(8) VALUE '========'.
            05 FILLER  PIC X(2) VALUE SPACES.
            05 FILLER  PIC X(10) VALUE '=========='.

       01  ITEM-LINE.
            05 DETAIL-DESCRIPTION  PIC X(16).
            05 FILLER              PIC X(2) VALUE SPACES.
            05 DETAIL-PRICE        PIC $$$,$$9.99.
            05 FILLER              PIC X(2) VALUE SPACES.
            05 DETAIL-QUANTITY     PIC ZZZZZZZ9.
            05 FILLER              PIC X(2) VALUE SPACES.
            05 DETAIL-COST         PIC $$$,$$9.99.

       01  TOTAL-LINE1.
            05 FILLER  PIC X(40) VALUE SPACES.
            05 FILLER  PIC X(10) VALUE '=========='.

       01  TOTAL-LINE2.
            05 FILLER              PIC X(32) VALUE SPACES.
            05 FILLER              PIC X(6) VALUE 'Items:'.
            05 FILLER              PIC X(2) VALUE SPACES.
            05 DET-TOTAL-QUANTITY  PIC ZZZZZZZZZ9.

       01  TOTAL-LINE3.
            05 FILLER           PIC X(32) VALUE SPACES.
            05 FILLER           PIC X(6) VALUE 'Total:'.
            05 FILLER           PIC X(2) VALUE SPACES.
            05 DET-TOTAL-COST   PIC $$$,$$9.99.

       01  TOTAL-LINE4.
            05 FILLER                  PIC X(27) VALUE SPACES.
            05 FILLER                  PIC X(11) VALUE 'Discounted:'.
            05 FILLER                  PIC X(2) VALUE SPACES.
            05 DET-TOTAL-DISCOUNTED    PIC $$$,$$9.99.

       PROCEDURE DIVISION.

       0001-START.
           PERFORM 0002-WELCOME-USER.
           PERFORM 0003-ASK-FOR-ITEM UNTIL DONE.
           PERFORM 0004-CALCULATE-DISCOUNT.
           PERFORM 0005-DISPLAY-BILL.
           STOP RUN.
       0001-END.

       0002-WELCOME-USER.
           DISPLAY 'Hi, welcome to the petstore cash register system!'.
       0002-END.

       0003-ASK-FOR-ITEM.
           MOVE 'Item description' TO ITEM-DESCRIPTION (I).
           MOVE 9.99 TO ITEM-PRICE (I).
           MOVE 9 TO ITEM-QUANTITY (I).
           COMPUTE ITEM-COST (I) = ITEM-QUANTITY (I) * ITEM-PRICE (I).
           ADD ITEM-QUANTITY (I) TO TOTAL-QUANTITY.
           ADD ITEM-COST (I) TO TOTAL-COST.
           ADD 1 TO I.
           MOVE 'N' TO USER-ANSWER.
       0003-END.

       0004-CALCULATE-DISCOUNT.
           IF TOTAL-COST IS GREATER THAN MINIMUM-FOR-DISCOUNT THEN
               COMPUTE TOTAL-COST-DISCOUNTED = TOTAL-COST * DISCOUNT
           ELSE
               MOVE TOTAL-COST TO TOTAL-COST-DISCOUNTED
           END-IF.
       0004-END.

       0005-DISPLAY-BILL.
           DISPLAY ' '.
           DISPLAY ' '.
           DISPLAY HEADING-LINE1.
           DISPLAY HEADING-LINE2.
           PERFORM VARYING J FROM 1 BY 1 UNTIL J IS EQUAL TO I
               MOVE ITEM-DESCRIPTION (J) TO DETAIL-DESCRIPTION
               MOVE ITEM-PRICE (J) TO DETAIL-PRICE
               MOVE ITEM-QUANTITY (J) TO DETAIL-QUANTITY
               MOVE ITEM-COST (J) TO DETAIL-COST
               DISPLAY ITEM-LINE
           END-PERFORM.
           DISPLAY TOTAL-LINE1.
           MOVE TOTAL-QUANTITY TO DET-TOTAL-QUANTITY.
           DISPLAY TOTAL-LINE2.
           MOVE TOTAL-COST TO DET-TOTAL-COST.
           DISPLAY TOTAL-LINE3.
           MOVE TOTAL-COST-DISCOUNTED TO DET-TOTAL-DISCOUNTED.
           DISPLAY TOTAL-LINE4.
       0005-END.

       END PROGRAM PETSTORE.
