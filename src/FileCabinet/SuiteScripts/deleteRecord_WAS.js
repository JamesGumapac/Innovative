/**
 * @NApiVersion 2.1
 * @NScriptType workflowactionscript
 */
define(['N/error', 'N/record', 'N/runtime', 'N/search', 'N/log'],

function(error, record, runtime, search, log) {
   
    /**
     *
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @Since 2016.1
     */
    function onAction(context, type) {
		
	try{
		
    	
    	var recObj = context.newRecord	 
	    var recId = recObj.id
		var recType = recObj.type
		log.debug('recType / recId:', recType +' / '+ recId)
		
		var recTypeString = recType.toUpperCase()
/**		
		if(recType == 'job') recTypeString = 'JOB'
		if(recType == 'job') recTypeString = 'JOB'
		if(recType == 'vendor') recTypeString = 'VENDOR'
**/

/////////ENTITY/////////////
		var entityApprovalStatus = recObj.getText({fieldId: 'custentity_dw_approval_status'})
		//var transactionApprovalStatus = recObj.getText({fieldId: 'custbody_dw_approval_status'})
		//only proceed if 
		if((recType == 'customer' || recType == 'vendor') && entityApprovalStatus == 'Rejected' ){
			
			record.delete({type: record.Type[recTypeString], id: recId})
				
		    log.debug('Finished script, deleted record:', recType +' / '+ recId);
			
			
		}
	  




		
	}
	catch(e){

	log.debug(e.name, e.message);

	}	
	
		
    }
    return {
        onAction : onAction
    };
    
    
});
