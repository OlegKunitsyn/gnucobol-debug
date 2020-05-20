#line 1 "/home/casa/dev/git/cobol-hello-world/datatypes.cob"
 IDENTIFICATION   DIVISION.
 PROGRAM-ID. datatypes.
 DATA DIVISION.
 WORKING-STORAGE SECTION.
 01 numeric-data.
 05 disp usage display pic s99v999 value -12.34.
 05 disp-u usage display pic 99v999 value 12.34.
 05 dispp usage display pic spppp9999 value -.0000123.
 05 dispp-u usage display pic pppp9999 value .0000123.
 05 disppp usage display pic s9999pppp value -12340000.
 05 disppp-u usage display pic 9999pppp value 12340000.
 05 bin usage binary pic s99v999 value -12.34.
 05 bin-u usage binary pic 99v999 value 12.34.
 05 cmp3 usage packed-decimal pic s99v999 value -12.34.
 05 cmp3-u usage packed-decimal pic 99v999 value 12.34.
 05 cmp5 usage comp-5 pic s99v999 value -12.34.
 05 cmp5-u usage comp-5 pic 99v999 value 12.34.
 05 cmp6 usage comp-6 pic 99v999 value 12.34.
 05 cmpx usage comp-x pic s99v999 value -12.34.
 05 cmpx-u usage comp-x pic 99v999 value 12.34.
 05 cmpn usage comp-n pic s99v999 value -12.34.
 05 cmpn-u usage comp-n pic 99v999 value 12.34.
 05 chr usage binary-char signed value -128.
 05 chr-u usage binary-char unsigned value 254.
 05 shrt usage binary-short signed value -32768.
 05 shrt-u usage binary-short unsigned value 65535.
 05 long usage binary-long signed value -2147483648.
 05 long-u usage binary-long unsigned value 4294967295.
 05 dble usage binary-double signed value -4294967295.
 05 dble-u usage binary-double unsigned value 8294967295.

 01 floating-data.
 05 dbl usage float-long value -3.40282e+038.
 05 flt usage float-short value 3.40282e+038.









 01 special-data.
 05 r2d2 usage bit pic 111 value b'110'.
 05 point usage pointer.
 05 ppoint usage program-pointer.
 05 idx usage index.
 05 hnd usage handle.
 01 alphanumeric-data.
 05 alpnum pic x(36) value "some numb3rs 4 n00bs l1k3 m3".
 05 alpha pic a(36) value "thats some text".
 05 edit-num1 pic --9.999.
 05 edit-num2 pic ++9.999.
 05 edit-num3 pic zz9.999.
 05 edit-num4 pic -zz9.999 blank when zero.
 01 national-data.
 05 nat pic n(36) value "data shown here will change.".
 05 nat-num pic 9(12)v9(3) usage national.
 05 net-num1 pic --9.999 usage national.
 05 net-num2 pic ++9.999 usage national.
 05 net-num3 pic zz9.999 usage national.
 05 net-num4 pic -zz9.999 usage national blank when zero.
 PROCEDURE DIVISION.
 set idx to 1
 set point to address of ppoint
 set ppoint to entry "types" 
 move cmp5 to edit-num1 edit-num2 edit-num3 edit-num4
 move cmp5 to net-num1 net-num2 net-num3 net-num4

 display disp
 display disp-u
 display dispp
 display dispp-u
 display disppp
 display disppp-u
 display bin
 display bin-u
 display cmp3
 display cmp3-u
 display cmp5
 display cmp5-u
 display cmp6
 display cmpx
 display cmpx-u
 display cmpn
 display cmpn-u
 display chr
 display chr-u
 display shrt
 display shrt-u
 display long
 display long-u
 display dble
 display dble-u
 display dbl
 display flt
 display r2d2
 display point
 display ppoint
 display idx
 display hnd
 display alpnum
 display alpha
 display edit-num1
 display edit-num2
 display edit-num3
 display edit-num4
 display nat
 display net-num1
 display net-num2
 display net-num3
 display net-num4

 display numeric-data
 display floating-data
 display special-data
 display alphanumeric-data
 display national-data

 GOBACK.
