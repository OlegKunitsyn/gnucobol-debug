/* Generated by           cobc 3.1-dev.0 */
/* Generated from         /home/casa/dev/git/cobol-hello-world/datatypes.cob */
/* Generated at           May 20 2020 21:12:33 */
/* GnuCOBOL build date    Apr 28 2020 22:46:23 */
/* GnuCOBOL package date  Apr 28 2020 12:55:27 UTC */
/* Compile command        cobc -x -g -fsource-location -ftraceall -Q --coverage -A --coverage -v /home/casa/dev/git/cobol-hello-world/datatypes.cob */

#include <stdio.h>
#include <string.h>
#define  COB_KEYWORD_INLINE __inline
#include <libcob.h>

#define  COB_SOURCE_FILE		"/home/casa/dev/git/cobol-hello-world/datatypes.cob"
#define  COB_PACKAGE_VERSION		"3.1-dev"
#define  COB_PATCH_LEVEL		0
#define  COB_MODULE_FORMATTED_DATE	"May 20 2020 21:12:33"
#define  COB_MODULE_DATE		20200520
#define  COB_MODULE_TIME		211233

/* Global variables */
#include "datatypes.c.h"

/* Function prototypes */

static int		datatypes ();
static int		datatypes_ (const int);
static void		datatypes_module_init (cob_module *module);

/* Main function */
int
main (int argc, char **argv)
{
  cob_init (argc, argv);
  cob_stop_run (datatypes ());
}

/* Functions */

/* PROGRAM-ID 'datatypes' */

/* ENTRY 'datatypes' */

static int
datatypes ()
{
  return datatypes_ (0);
}

static int
datatypes_ (const int entry)
{
  /* Program local variables */
  #include "datatypes.c.l.h"

  /* Start of function code */

  /* CANCEL callback */
  if (unlikely(entry < 0)) {
  	if (entry == -10)
  		goto P_dump;
  	if (entry == -20)
  		goto P_clear_decimal;
  	goto P_cancel;
  }

  /* Check initialized, check module allocated, */
  /* set global pointer, */
  /* push module stack, save call parameter count */
  if (cob_module_global_enter (&module, &cob_glob_ptr, 0, entry, 0))
  	return -1;

  /* Set address of module parameter list */
  module->cob_procedure_params = cob_procedure_params;

  /* Set frame stack pointer */
  frame_ptr = frame_stack;
  frame_ptr->perform_through = 0;
  frame_ptr->return_address_ptr = &&P_cgerror;
  frame_overflow = frame_ptr + 255 - 1;

  /* Initialize rest of program */
  if (unlikely(initialized == 0)) {
  	goto P_initialize;
  }
  P_ret_initialize:

  /* Increment module active */
  module->module_active++;

  /* Entry dispatch */
  goto l_2;

  /* PROCEDURE DIVISION */

  /* Line: 64        : Entry     datatypes               : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  l_2:;
  module->module_stmt = 0x00100040;
  cob_trace_entry (st_1);
  module->module_stmt = 0x00100041;
  cob_trace_sect (NULL);
  cob_trace_para (NULL);

  /* Line: 65        : SET                : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  cob_trace_stmt (st_2);
  (*(int *) (b_37 + 17)) = 1;

  /* Line: 66        : SET                : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100042;
  cob_trace_stmt (st_2);
  (*(unsigned char **) (b_37 + 1)) = (b_37 + 9);

  /* Line: 67        : SET                : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100043;
  cob_trace_stmt (st_2);
  (*(unsigned char **) (b_37 + 9)) = cob_call_field ((cob_field *)&c_1, NULL, 0, 0);

  /* Line: 68        : MOVE               : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100044;
  cob_trace_stmt (st_3);
  cob_move (&f_19, &f_46);
  cob_move (&f_19, &f_47);
  cob_move (&f_19, &f_48);
  cob_move (&f_19, &f_49);

  /* Line: 69        : MOVE               : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100045;
  cob_trace_stmt (st_3);
  cob_move (&f_19, &f_53);
  cob_move (&f_19, &f_54);
  cob_move (&f_19, &f_55);
  cob_move (&f_19, &f_56);

  /* Line: 71        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100047;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_9);

  /* Line: 72        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100048;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_10);

  /* Line: 73        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100049;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_11);

  /* Line: 74        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010004A;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_12);

  /* Line: 75        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010004B;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_13);

  /* Line: 76        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010004C;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_14);

  /* Line: 77        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010004D;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_15);

  /* Line: 78        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010004E;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_16);

  /* Line: 79        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010004F;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_17);

  /* Line: 80        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100050;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_18);

  /* Line: 81        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100051;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_19);

  /* Line: 82        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100052;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_20);

  /* Line: 83        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100053;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_21);

  /* Line: 84        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100054;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_22);

  /* Line: 85        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100055;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_23);

  /* Line: 86        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100056;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_24);

  /* Line: 87        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100057;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_25);

  /* Line: 88        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100058;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_26);

  /* Line: 89        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100059;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_27);

  /* Line: 90        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010005A;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_28);

  /* Line: 91        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010005B;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_29);

  /* Line: 92        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010005C;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_30);

  /* Line: 93        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010005D;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_31);

  /* Line: 94        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010005E;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_32);

  /* Line: 95        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010005F;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_33);

  /* Line: 96        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100060;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_35);

  /* Line: 97        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100061;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_36);

  /* Line: 98        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100062;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_38);

  /* Line: 99        : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100063;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_39);

  /* Line: 100       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100064;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_40);

  /* Line: 101       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100065;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_41);

  /* Line: 102       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100066;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_42);

  /* Line: 103       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100067;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_44);

  /* Line: 104       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100068;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_45);

  /* Line: 105       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100069;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_46);

  /* Line: 106       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010006A;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_47);

  /* Line: 107       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010006B;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_48);

  /* Line: 108       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010006C;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_49);

  /* Line: 109       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010006D;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_51);

  /* Line: 110       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010006E;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_53);

  /* Line: 111       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x0010006F;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_54);

  /* Line: 112       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100070;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_55);

  /* Line: 113       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100071;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_56);

  /* Line: 115       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100073;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_8);

  /* Line: 116       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100074;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_34);

  /* Line: 117       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100075;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_37);

  /* Line: 118       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100076;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_43);

  /* Line: 119       : DISPLAY            : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100077;
  cob_trace_stmt (st_4);
  cob_display (0, 1, 1, &f_50);

  /* Line: 121       : GOBACK             : /home/casa/dev/git/cobol-hello-world/datatypes.cob */
  module->module_stmt = 0x00100079;
  cob_trace_stmt (st_5);
  goto exit_program;

  module->module_stmt = 0x0010007A;

  /* Program exit */

  exit_program:

  /* Decrement module active count */
  if (module->module_active) {
  	module->module_active--;
  }

  /* Trace program exit */
  cob_trace_exit (st_1);

  /* Pop module stack */
  cob_module_leave (module);

  /* Program return */
  return b_2;
  P_cgerror:
  	cob_fatal_error (COB_FERROR_CODEGEN);


  /* Program initialization */
  P_initialize:

  cob_check_version (COB_SOURCE_FILE, COB_PACKAGE_VERSION, COB_PATCH_LEVEL);

  cob_module_path = cob_glob_ptr->cob_main_argv0;

  datatypes_module_init (module);

  module->crt_status = NULL;

  /* Initialize cancel callback */
  cob_set_cancel (module);

  /* Initialize WORKING-STORAGE */
  b_2 = 0;
  cob_move ((cob_field *)&c_2, &f_9);
  cob_move ((cob_field *)&c_3, &f_10);
  cob_move ((cob_field *)&c_4, &f_11);
  cob_move ((cob_field *)&c_5, &f_12);
  cob_move ((cob_field *)&c_6, &f_13);
  cob_move ((cob_field *)&c_7, &f_14);
  cob_move ((cob_field *)&c_2, &f_15);
  cob_move ((cob_field *)&c_3, &f_16);
  cob_move ((cob_field *)&c_2, &f_17);
  cob_move ((cob_field *)&c_3, &f_18);
  cob_move ((cob_field *)&c_2, &f_19);
  cob_move ((cob_field *)&c_3, &f_20);
  cob_move ((cob_field *)&c_3, &f_21);
  cob_move ((cob_field *)&c_2, &f_22);
  cob_move ((cob_field *)&c_3, &f_23);
  cob_move ((cob_field *)&c_2, &f_24);
  cob_move ((cob_field *)&c_3, &f_25);
  cob_move ((cob_field *)&c_8, &f_26);
  cob_move ((cob_field *)&c_9, &f_27);
  cob_move ((cob_field *)&c_10, &f_28);
  cob_move ((cob_field *)&c_11, &f_29);
  cob_move ((cob_field *)&c_12, &f_30);
  cob_move ((cob_field *)&c_13, &f_31);
  cob_move ((cob_field *)&c_14, &f_32);
  cob_move ((cob_field *)&c_15, &f_33);
  cob_move ((cob_field *)&c_16, &f_35);
  cob_move ((cob_field *)&c_17, &f_36);
  cob_move ((cob_field *)&c_18, &f_38);
  memset (b_37 + 1, 0, 24);
  memcpy (b_43, "some numb3rs 4 n00bs l1k3 m3", 28);
  memset (b_43 + 28, 32, 8);
  memcpy (b_43 + 36, "thats some text", 15);
  memset (b_43 + 36 + 15, 32, 21);
  cob_move (&cob_all_zero, &f_46);
  cob_move (&cob_all_zero, &f_47);
  cob_move (&cob_all_zero, &f_48);
  cob_move (&cob_all_zero, &f_49);
  memcpy (b_50, "data shown here will change.", 28);
  memset (b_50 + 28, 32, 44);
  memset (b_50 + 72, 48, 15);
  cob_move (&cob_all_zero, &f_53);
  cob_move (&cob_all_zero, &f_54);
  cob_move (&cob_all_zero, &f_55);
  cob_move (&cob_all_zero, &f_56);

  if (0 == 1) goto P_cgerror;
  initialized = 1;
  goto P_ret_initialize;

  P_dump:
  return 0;


  /* CANCEL callback handling */
  P_cancel:

  if (!initialized)
  	return 0;
  if (module && module->module_active)
  	cob_fatal_error (COB_FERROR_CANCEL);

  initialized = 0;

  P_clear_decimal:

  return 0;

}

/* End PROGRAM-ID 'datatypes' */

/* Initialize module structure for datatypes */
static void datatypes_module_init (cob_module *module)
{
  module->module_name = "datatypes";
  module->module_formatted_date = COB_MODULE_FORMATTED_DATE;
  module->module_source = COB_SOURCE_FILE;
  module->module_entry.funcptr = (void *(*)())datatypes;
  module->module_cancel.funcptr = (void *(*)())datatypes_;
  module->module_ref_count = NULL;
  module->module_path = &cob_module_path;
  module->module_active = 0;
  module->module_date = COB_MODULE_DATE;
  module->module_time = COB_MODULE_TIME;
  module->module_type = 0;
  module->module_param_cnt = 0;
  module->ebcdic_sign = 0;
  module->decimal_point = '.';
  module->currency_symbol = '$';
  module->numeric_separator = ',';
  module->flag_filename_mapping = 1;
  module->flag_binary_truncate = 1;
  module->flag_pretty_display = 1;
  module->flag_host_sign = 0;
  module->flag_no_phys_canc = 1;
  module->flag_main = 1;
  module->flag_fold_call = 0;
  module->flag_exit_program = 0;
  module->flag_debug_trace = 6;
  module->flag_dump_ready = 0;
  module->module_stmt = 0;
  module->module_sources = st_source_files;
}

/* End functions */
