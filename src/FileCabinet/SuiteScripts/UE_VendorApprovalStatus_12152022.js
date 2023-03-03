/**
* @NApiVersion 2.x
* @NScriptType UserEventScript
* @NModuleScope SameAccount
* 
**/

define(['N/search', 'N/record', 'N/runtime', 'N/error'],

function (search, record, runtime, error) {
    
    function csvError() {
        var errorObj = error.create({
            name: 'VENDOR_UNAPPROVED',
            message: 'This vendor is un-approved. Please use another vendor that is approved',
            notifyOff: true
        });
        return errorObj.message;
    }
    
    function beforeSubmit(context) {
        try {
            var recordObj = context.newRecord
            var userObj = runtime.getCurrentUser();
            var userRole = userObj.role

            log.error("=======START=======", { RECORDTYPE: recordObj.type });
            log.error("role", userRole);
            log.error("runtime.executionContext", runtime.executionContext)

            if (runtime.executionContext == runtime.ContextType.CSV_IMPORT || runtime.executionContext == runtime.ContextType.USER_INTERFACE) {
                
                var vendorName = recordObj.getValue({
                    fieldId: 'entity'
                })
                log.error('vendor name', vendorName)
                
                var vendorStatus = search.lookupFields({
                    type: search.Type.ENTITY,
                    id: vendorName,
                    columns: ['recordtype', 'custentity_vend_approval_status']
                });
                log.error('VENDOR LOOKUP', vendorStatus)
                
                if (vendorStatus.recordtype == "employee") {
                    log.error('RECORDTYPE > EMPLOYEE', 'STOP')
                    return 
                }

                if (vendorStatus.custentity_vend_approval_status && vendorStatus.custentity_vend_approval_status.length) {
                    var vendorApprovalStatus = vendorStatus.custentity_vend_approval_status[0].value
                    log.error('vendor status', vendorApprovalStatus);
                    
                    if (vendorApprovalStatus == 1 || vendorApprovalStatus == 3) {
                        throw csvError()
                    }
                }
            }
        } catch(e) {
            log.error('beforeSubmit error', e.message)
        }
    }
    return {
        beforeSubmit: beforeSubmit
    }
}

);