/**
 * @NApiVersion 2.x
 * @NScriptType workflowactionscript
 */
 
define(["N/redirect","N/runtime"],

function(redirect,runtime) {
   
    function onAction(context) {
    	try{
            var scriptObj = runtime.getCurrentScript();
			var wfCustomerRec = context.newRecord;
			var recordId = wfCustomerRec.id;
			var recordType = wfCustomerRec.type;
            var rejectField = scriptObj.getParameter({name: 'custscript_wfa_reject_reason_id'});
			log.debug('recordId',recordId);
		
		redirect.toSuitelet({
			scriptId: 'customscript_sl_reject_reason',
			deploymentId: 'customdeploy_sl_reject_reason',
			parameters: {'recordId':recordId,'recordType':recordType,'rejectField':rejectField,'cancel':false}
		});
		
		}catch(ex){
			log.debug('error in OnAction() function',ex);
		}	
		 
		
    }

    return {
        onAction : onAction
    };
    
});