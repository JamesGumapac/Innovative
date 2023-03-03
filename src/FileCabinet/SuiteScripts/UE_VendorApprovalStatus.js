/**
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * 
**/

 define(['N/search', 'N/record', 'N/runtime', 'N/error'],

 function(search, record, runtime, error) {

    function csvError() {
        var errorObj = error.create({
            name: 'VENDOR_UNAPPROVED',
            message: 'This vendor is un-approved. Please use another vendor that is approved',
            notifyOff: true
        });
      return errorObj.message;
    }

     function beforeSubmit (context) {

        var recordObj = context.newRecord

        var userObj = runtime.getCurrentUser();
        var userRole = userObj.role

log.debug("role",userRole);
        if (runtime.executionContext == runtime.ContextType.CSV_IMPORT || runtime.executionContext == runtime.ContextType.USER_INTERFACE) {
            
            var vendorName = recordObj.getValue({
                fieldId: 'entity'
            })  
    
            log.debug('vendor name', vendorName)
    
            var vendorStatus = search.lookupFields({
                type: search.Type.VENDOR,
                id: vendorName,
                columns: 'custentity_vend_approval_status'
            });
    
            if (vendorStatus.custentity_vend_approval_status.length) {
                    
                var vendorApprovalStatus = vendorStatus.custentity_vend_approval_status[0].value
    
                log.debug('vendor status',vendorApprovalStatus);
    
                    if (vendorApprovalStatus == 1 || vendorApprovalStatus == 3 ) {
            
                        throw csvError()

                    } 
                
            }

        }
        
       
       
                 
             
     }
     return {beforeSubmit : beforeSubmit}
 }
 
 );
