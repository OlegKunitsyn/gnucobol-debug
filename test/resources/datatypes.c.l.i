#line 1 "/home/casa/dev/git/cobol-hello-world/datatypes.c.l.h"










 unsigned int initialized = 0


 cob_module *module = NULL









 cob_frame *frame_overflow
 cob_frame *frame_ptr
 cob_frame frame_stack[255]



 int b_2 /* RETURN-CODE */
 cob_u8_t b_8[93] __attribute__((aligned)) /* numeric-data
 cob_u8_t b_34[12] __attribute__((aligned)) /* floating-data
 cob_u8_t b_37[25] __attribute__((aligned)) /* special-data
 cob_u8_t b_43[101] __attribute__((aligned)) /* alphanumeric-
 cob_u8_t b_50[116] __attribute__((aligned)) /* national-data

 of local data storage */



 cob_field f_8 = {93 b_8 &a_36} /* numeric-data */
 cob_field f_9 = {5 b_8 &a_7} /* disp */
 cob_field f_10 = {5 b_8 + 5 &a_8} /* disp-u */
 cob_field f_11 = {4 b_8 + 10 &a_9} /* dispp */
 cob_field f_12 = {4 b_8 + 14 &a_10} /* dispp-u */
 cob_field f_13 = {4 b_8 + 18 &a_11} /* disppp */
 cob_field f_14 = {4 b_8 + 22 &a_12} /* disppp-u */
 cob_field f_15 = {4 b_8 + 26 &a_13} /* bin */
 cob_field f_16 = {4 b_8 + 30 &a_14} /* bin-u */
 cob_field f_17 = {3 b_8 + 34 &a_15} /* cmp3 */
 cob_field f_18 = {3 b_8 + 37 &a_16} /* cmp3-u */
 cob_field f_19 = {4 b_8 + 40 &a_2} /* cmp5 */
 cob_field f_20 = {4 b_8 + 44 &a_17} /* cmp5-u */
 cob_field f_21 = {3 b_8 + 48 &a_18} /* cmp6 */
 cob_field f_22 = {3 b_8 + 51 &a_19} /* cmpx */
 cob_field f_23 = {3 b_8 + 54 &a_20} /* cmpx-u */
 cob_field f_24 = {3 b_8 + 57 &a_19} /* cmpn */
 cob_field f_25 = {3 b_8 + 60 &a_20} /* cmpn-u */
 cob_field f_26 = {1 b_8 + 63 &a_21} /* chr */
 cob_field f_27 = {1 b_8 + 64 &a_22} /* chr-u */
 cob_field f_28 = {2 b_8 + 65 &a_23} /* shrt */
 cob_field f_29 = {2 b_8 + 67 &a_24} /* shrt-u */
 cob_field f_30 = {4 b_8 + 69 &a_25} /* long */
 cob_field f_31 = {4 b_8 + 73 &a_26} /* long-u */
 cob_field f_32 = {8 b_8 + 77 &a_27} /* dble */
 cob_field f_33 = {8 b_8 + 85 &a_28} /* dble-u */
 cob_field f_34 = {12 b_34 &a_36} /* floating-data */
 cob_field f_35 = {8 b_34 &a_29} /* dbl */
 cob_field f_36 = {4 b_34 + 8 &a_30} /* flt */
 cob_field f_37 = {25 b_37 &a_36} /* special-data */
 cob_field f_38 = {1 b_37 &a_31} /* r2d2 */
 cob_field f_39 = {8 b_37 + 1 &a_32} /* point */
 cob_field f_40 = {8 b_37 + 9 &a_32} /* ppoint */
 cob_field f_41 = {4 b_37 + 17 &a_33} /* idx */
 cob_field f_42 = {4 b_37 + 21 &a_33} /* hnd */
 cob_field f_43 = {101 b_43 &a_36} /* alphanumeric-data */
 cob_field f_44 = {36 b_43 &a_34} /* alpnum */
 cob_field f_45 = {36 b_43 + 36 &a_34} /* alpha */
 cob_field f_46 = {7 b_43 + 72 &a_3} /* edit-num1 */
 cob_field f_47 = {7 b_43 + 79 &a_4} /* edit-num2 */
 cob_field f_48 = {7 b_43 + 86 &a_5} /* edit-num3 */
 cob_field f_49 = {8 b_43 + 93 &a_6} /* edit-num4 */
 cob_field f_50 = {116 b_50 &a_36} /* national-data */
 cob_field f_51 = {72 b_50 &a_35} /* nat */
 cob_field f_53 = {7 b_50 + 87 &a_3} /* net-num1 */
 cob_field f_54 = {7 b_50 + 94 &a_4} /* net-num2 */
 cob_field f_55 = {7 b_50 + 101 &a_5} /* net-num3 */
 cob_field f_56 = {8 b_50 + 108 &a_6} /* net-num4 */

 of fields */

