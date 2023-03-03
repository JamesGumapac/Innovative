/**
*@NApiVersion 2.x
*@NScriptType ClientScript
*/

var ALLOW_SAVE = true;

define(['N/search', 'N/runtime'],

function (search, runtime) {


    function saveRecord(context) {
        var orderType = context.currentRecord.getValue({
            fieldId: 'ordertype'
        });
        var vendorName = context.currentRecord.getValue({
            fieldId: 'entity'
        })
        var vendorStatus = search.lookupFields({
            type: search.Type.VENDOR,
            id: vendorName,
            columns: 'custentity_vend_approval_status'
        });
        if (ALLOW_SAVE == false) {
            alert("This vendor is un-approved. Please use another vendor that is approved.");
            return false;
        } else {
            return true;
        }
    }

    function pageInit(context) {
        validateVendor(context, 'pageInit');
    }

    function validateField(context) {
        return validateVendor(context, 'validateField');
    }

    function validateVendor(context, eventType) {
        var orderType = context.currentRecord.getValue({
            fieldId: 'ordertype'
        });
        var userObj = runtime.getCurrentUser();
        var userRole = userObj.role

        console.log('ROLE', userRole);

        var vendorName = context.currentRecord.getValue({
            fieldId: 'entity'
        })

        var isPageInit = eventType === 'pageInit';
        var isValidateField = eventType === 'validateField';
        var isCheckEntity = isPageInit || (isValidateField && context.fieldId == 'entity');
        if (isCheckEntity && userRole != 3 && vendorName != '') {
            console.log('vendorName', vendorName);
            var vendorStatus = search.lookupFields({
                type: search.Type.VENDOR,
                id: vendorName,
                columns: 'custentity_vend_approval_status'
            });

            if (vendorStatus.custentity_vend_approval_status.length) {
                var vendorApprovalStatus = vendorStatus.custentity_vend_approval_status[0].value
                console.log(vendorApprovalStatus);

                if ((vendorApprovalStatus == 1 || vendorApprovalStatus == 3) && vendorApprovalStatus != '') {
                    alert("This vendor is un-approved. Please use another vendor that is approved.");
                    ALLOW_SAVE = false;
                    console.log('within if', ALLOW_SAVE);

                    context.currentRecord.setValue({
                        fieldId: 'entity',
                        value: ''
                    })
                } else {
                    console.log('within else', ALLOW_SAVE);
                    // ALLOW_SAVE = true;   
                }
            }
            ALLOW_SAVE = true;
        }

        return true;
    }

    // function validateField(context) {
    //     var orderType = context.currentRecord.getValue({
    //         fieldId: 'ordertype'
    //     });
    //         var userObj = runtime.getCurrentUser();
    //         var userRole = userObj.role

    //         console.log('ROLE', userRole);

    //         var vendorName = context.currentRecord.getValue({
    //             fieldId: 'entity'
    //         })  

    //         if (context.fieldId == 'entity' && userRole != 3 && vendorName != '') {
    //             console.log('vendorName', vendorName);
    //             var vendorStatus = search.lookupFields({
    //                 type: search.Type.VENDOR,
    //                 id: vendorName,
    //                 columns: 'custentity_vend_approval_status'
    //             });

    //             if (vendorStatus.custentity_vend_approval_status.length) {
    //                 var vendorApprovalStatus = vendorStatus.custentity_vend_approval_status[0].value
    //                 console.log(vendorApprovalStatus);
    //                     if ((vendorApprovalStatus == 1 || vendorApprovalStatus == 3) && vendorApprovalStatus != '' ) {
    //                         alert("This vendor is un-approved. Please use another vendor that is approved.");
    //                         ALLOW_SAVE = false;
    //                         console.log('within if', ALLOW_SAVE);
    //                         context.currentRecord.setValue({
    //                             fieldId: 'entity',
    //                             value: ''
    //                         })
    //                     } else{
    //                         console.log('within else', ALLOW_SAVE);
    //                         // ALLOW_SAVE = true;   
    //                     }
    //             }
    //             ALLOW_SAVE = true;   
    //         }
    //     return true;
    // }

    return {
        pageInit: pageInit,
        saveRecord: saveRecord,
        validateField: validateField
    };
});	