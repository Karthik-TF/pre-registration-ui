import { addDisabledUiField } from  'src/app/shared/global-vars';
const copyAndDisableIfFilled = async (context, args, uiField) => {
  if (args.length > 0) {
    let checkboxVal = context.userForm.controls[`${uiField.id}`].value;
    for (const arg of args) {
      let controlsArr = arg.split("=");
      if (controlsArr.length > 1) {
        let control1 = controlsArr[0],
          control2 = controlsArr[1];
        let filteredList1 = context.uiFields.filter(
          (uiField) => uiField.id == control1
        );
        let filteredList2 = context.uiFields.filter(
          (uiField) => uiField.id == control2
        );
        if (filteredList1.length > 0 && filteredList2.length > 0) {
          let uiField1 = filteredList1[0];
          let uiField2 = filteredList2[0];

          if (
            context.isControlInMultiLang(uiField1) &&
            context.isControlInMultiLang(uiField2)
          ) {
            // Multi-language field handling
            context.dataCaptureLanguages.forEach((language, i) => {
              const fromId = uiField1.id + "_" + language;
              const fromFieldValue = context.userForm.controls[fromId].value;
              const toId = uiField2.id + "_" + language;
              if (checkboxVal === true) {
                context.userForm.controls[toId].setValue(fromFieldValue);
                // Disable only if the field is filled
                if (fromFieldValue) {
                  context.userForm.controls[toId].disable();
                  addDisabledUiField(uiField2);
                }
              } else {
                context.userForm.controls[toId].enable();
              }
            });
          } else {
            // Non-multi-language field handling
            const fromFieldValue = context.userForm.controls[uiField1.id].value;
            if (checkboxVal === true) {
              context.userForm.controls[uiField2.id].setValue(fromFieldValue);
              // Disable only if the field is filled
              if (fromFieldValue) {
                context.userForm.controls[uiField2.id].disable();
                addDisabledUiField(uiField2);
              }
              // Special handling for dropdowns or buttons
              if (
                uiField2.controlType === "dropdown" ||
                uiField2.controlType === "button"
              ) {
                context.selectOptionsDataArray[`${uiField2.id}`] =
                  context.selectOptionsDataArray[`${uiField1.id}`];
                context.searchInDropdown(uiField2.id);
                if (context.isThisFieldInLocationHeirarchies(uiField2.id)) {
                  context.resetLocationFields(uiField2.id);
                }
              }
            } else {
              context.userForm.controls[uiField2.id].enable();
            }
          }
        }
      }
    }
  } else {
    console.log(
      "Invalid number of arguments sent to 'copyAndDisableIfFilled' changeAction."
    );
  }
};
export default copyAndDisableIfFilled;
