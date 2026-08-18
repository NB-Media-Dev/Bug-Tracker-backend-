
export function clearDumpStorage() {
  const dumpKeys = [
    "reported_bugs_list",
    "all_employees_list",
    "developer_notifications",
    "developer_project_submissions",
    "reopen_bug_data",
    "autofill_report_form",
    "selected_project_name",
    "selected_developer_name",
    "selected_test_name",
    "test_name",
  ];

  dumpKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error("error in cleardummydata",e);    
    }
  });
}
