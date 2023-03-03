/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/record', 'N/search'],

	(record, search) => {
	   
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
			var { type, newRecord } = scriptContext;

			if( !type.match(/create|copy|edit/gi) )
				return;

			try{
				var isReversal = newRecord.getValue({ fieldId: 'isreversal' });
				if(isReversal == 'T' || isReversal === true )
					return;

				var reversalJE = search.create({
					type: newRecord.type,
					filters: [['internalid', 'anyof', newRecord.id]],
					columns: [{ name: 'reversalnumber' }]
				}).run().getRange(0,1)[0].getValue({ name: 'reversalnumber' });

				if(reversalJE){
					reversalJE = search.create({
						type: newRecord.type,
						filters: ['tranid', 'is', reversalJE]
					}).run().getRange(0,1)[0].id;

					search.create({
						type: newRecord.type,
						filters: [[ 'internalid', 'anyof', newRecord.id ]],
						columns: [{ name: 'internalid', join: 'file', summary: 'GROUP', sort: 'ASC' }]
					}).run().getRange(0,1000).forEach(res=>{

						record.attach({
							record: {
								type: 'file',
								id: res.getValue(res.columns[0])
							},
							to: {
								type: newRecord.type,
								id: reversalJE
							}
						});

					});
				}
			}catch(e){
				log.debug('Error', e);
			}
		}

		return {
//			beforeLoad,
//			beforeSubmit,
			afterSubmit
		};
		
	});
