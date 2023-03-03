/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/record', 'N/runtime', 'N/search', 'N/url'],

	(record, runtime, search, url) => {
	   
		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {string} scriptContext.type - Trigger type
		 * @param {Form} scriptContext.form - Current form
		 * @Since 2015.2
		 */
		const beforeLoad = scriptContext => {

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		const beforeSubmit = scriptContext => {

		}

		/**
		 * Function definition to be triggered before record is loaded.
		 *
		 * @param {Object} scriptContext
		 * @param {Record} scriptContext.newRecord - New record
		 * @param {Record} scriptContext.oldRecord - Old record
		 * @param {string} scriptContext.type - Trigger type
		 * @Since 2015.2
		 */
		const afterSubmit = scriptContext => {
			let { newRecord, type } = scriptContext;

			if(!type.match(/create|copy|edit/gi))
				return;

			let lookupField = search.lookupFields({
				type: newRecord.type,
				id: newRecord.id,
				columns: ['custrecord_department_wf_approver', 'custrecord_department_mgr_wf_approver']
			});

			let script = runtime.getCurrentScript();
			let scriptId = script.getParameter('custscript_ueautogenbillapplink_suitelet');
			let deploymentId = script.getParameter('custscript_ueautogencustbillapplk_deploy');

			if(lookupField.custrecord_department_wf_approver && lookupField.custrecord_department_wf_approver.length){

				let approverId = lookupField.custrecord_department_wf_approver[0].value;
				let lookupFields = search.lookupFields({
					type: 'employee',
					id: approverId,
					columns: ['custentity_salora_billapprover', 'custentity_salora_tokenid']
				});

				if(!lookupFields.custentity_salora_billapprover || !lookupFields.custentity_salora_tokenid){

					let key1 = Math.random().toString(36).substring(2) +
						parseInt().toString(36) +
						Date.parse(new Date()).toString(36);

					record.submitFields({
						type: 'employee',
						id: approverId,
						values: {
							custentity_salora_billapprover: true,
							custentity_salora_tokenid: key1,
							custentity_salora_billapprovallink: url.resolveScript({
								scriptId, deploymentId, returnExternalUrl: true,
								params: { eid: key1 }
							})
						}
					});
				}
			}

			if(lookupField.custrecord_department_mgr_wf_approver && lookupField.custrecord_department_mgr_wf_approver.length){

				let approverId = lookupField.custrecord_department_wf_approver[0].value;
				let lookupFields = search.lookupFields({
					type: 'employee',
					id: approverId,
					columns: ['custentity_salora_billapprover', 'custentity_salora_tokenid']
				});

				if(!lookupFields.custentity_salora_billapprover || !lookupFields.custentity_salora_tokenid){
					let key2 = Math.random().toString(36).substring(2) +
						parseInt().toString(36) +
						Date.parse(new Date()).toString(36);

					record.submitFields({
						type: 'employee',
						id: approverId,
						values: {
							custentity_salora_billapprover: true,
							custentity_salora_tokenid: key2,
							custentity_salora_billapprovallink: url.resolveScript({
								scriptId, deploymentId, returnExternalUrl: true,
								params: { eid: key2 }
							})
						}
					});
				}
			}
		}

		return {
//			beforeLoad,
//			beforeSubmit,
			afterSubmit
		};
		
	});
