/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 */
define(['N/config', 'N/email', 'N/file', 'N/format', 'N/https', 'N/record', 'N/render', 'N/runtime', 'N/search', 'N/url'],

	(config, email, file, format, https, record, render, runtime, search, url) => {
	   
		/**
		 * Marks the beginning of the Map/Reduce process and generates input data.
		 *
		 * @typedef {Object} ObjectRef
		 * @property {number} id - Internal ID of the record instance
		 * @property {string} type - Record type id
		 *
		 * @return {Array|Object|Search|RecordRef} inputSummary
		 * @since 2015.1
		 */
		const getInputData = () => {
			return search.create({
				type: 'entitygroup',
//				filters: [['internalid', 'anyof', '41922']],
				filters: [
/*					[
						['custentity_lastemailsentdate', 'isempty', ''], 'OR',
						['formulanumeric: CASE WHEN ROUND({today}-{custentity_lastemailsentdate},0) > 29 THEN 1 ELSE 0 END', 'equalto', '1']

					], 'AND',*/
					['groupmember.custentity_id_sendcustomerstatement', 'is', 'T'], 'AND',
					['custentity_group_parentcustomer', 'noneof', '@NONE@']
				],
				columns: [
					{ name: 'internalid' },
					{ name: 'email' },
					{ name: 'custentity_group_contactname' },
					{ name: 'custentity_group_billingaddress' },
					{ name: 'custentity_group_parentcustomer' },
					{ name: 'internalid', join: 'groupmember' },
					{ name: 'email', join: 'groupmember' },
					{ name: 'formuladate', formula: '{today}' }
				]
			});
		}

		/**
		 * Executes when the map entry point is triggered and applies to each key/value pair.
		 *
		 * @param {MapSummary} context - Data collection containing the key/value pairs to process through the map stage
		 * @since 2015.1
		 */
		const map = context => {
//log.debug('context.value', context.value);
			try{
				var values = JSON.parse(context.value).values;

				context.write({
					key: values.internalid.value,
					value: {
						groupemail: values.email,
						contactname: values['custentity_group_contactname'],
						billingaddress: values['custentity_group_billingaddress'],
						parentcustomer: values['custentity_group_parentcustomer'].value,
						memberid: values['internalid.groupmember'].value,
						email: values['email.groupmember'],
						today: values['formuladate']
					}
				});

			}catch(e){
				log.debug('- MAP ERROR -', e);
			}
		}

		/**
		 * Executes when the reduce entry point is triggered and applies to each group.
		 *
		 * @param {ReduceSummary} context - Data collection containing the groups to process through the reduce stage
		 * @since 2015.1
		 */
		const reduce = context => {
log.debug('context.key', context.values);
			try{

				var script = runtime.getCurrentScript();
				var author = script.getParameter('custscript_se_sea_author');
				var formId = script.getParameter('custscript_se_sea_pdftemplate');
				var cc = script.getParameter('custscript_se_sea_cc');
				cc = cc? cc.split(','): null;

				var today = '';
				var entityId = '';
				var contactName = '';
				var billAddress = '';
				var entityIds = [];
				var recipients = [];
				context.values.forEach((a, i) => {
					var a = JSON.parse(a);

					today = a.today;

					if(!i && a.groupemail)
						recipients.push(a.groupemail);

					if(!i && a.contactname)
						contactName = a.contactname;

					if(!i && a.billingaddress)
						billAddress = a.billingaddress;

					if(!i && a.parentcustomer)
						entityId = parseInt(a.parentcustomer);

					if(recipients.indexOf(a.email) < 0 && a.email)
						recipients.push(a.email);
					
					entityIds.push( a.memberid );
				});

				search.create({
					type: 'invoice',
					filters: [
						['mainline', 'is', 'T'], 'AND',
						['status', 'anyof', 'CustInvc:A'], 'AND',
						['amountremaining', 'greaterthan', '0.00'], 'AND',
						[
							['name', 'anyof', entityIds], 'OR',
							[
								['job.parent', 'anyof', entityIds], 'AND',
								['job.custentity_id_sendcustomerstatement', 'is', 'T']
							]
						]
					],
					columns: [
						{ name: 'subsidiary', summary: search.Summary.GROUP }
					]
				}).run().getRange(0,1000).map(res=>{
					return parseInt(res.getValue(res.columns[0]));
				}).forEach(subsidiaryId => {

					var table = ``;
					var tranIds = [];
					var totalAmount = 0;
					var daysOverdue = '';
					var startDate = '';
					getAllSSResult( search.create({
						type: 'invoice',
						filters: [
							['mainline', 'is', 'T'], 'AND',
							['status', 'anyof', 'CustInvc:A'], 'AND',
							['amountremaining', 'greaterthan', '0.00'], 'AND',
							['subsidiary', 'anyof', subsidiaryId], 'AND',
							[
								['name', 'anyof', entityIds], 'OR',
								['job.parent', 'anyof', entityIds]
							]
						],
						columns: [
							{ name: 'daysoverdue' },
							{ name: 'tranid' },
							{ name: 'trandate' },
							{ name: 'duedate', sort: search.Sort.ASC },
							{ name: 'daysoverdue' },//daysopen
							{ name: 'amountremaining' },
							{ name: 'entityid', join: 'job' }
						]
					}).run() ).forEach((res, ind)=>{
	log.debug('res', res.getAllValues());
						 if(!ind){
							daysOverdue = parseInt(res.getValue(res.columns[0]));
							startDate = res.getValue({ name: 'trandate' });
						 }

						 if(daysOverdue < 90 & !ind){
							table += `<table width="80%">
								<tr>
									<th><b>Num</b></th>
									<th><b>Date</b></th>
									<th><b>Due Date</b></th>
									<th><b>Days Aged</b></th>
									<th><b>Amount</b></th>
									<th><b>Reference #</b></th>
								</tr>
								<tr>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
								</tr>`;
						 }

						 if(daysOverdue < 90){
							table += `<tr>`;
							res.columns.forEach((col, i)=>{
								if(!i)
									return;

								var value = res.getText(col) || res.getValue(col) || '';
								if(col.name.match(/amount/gi))
									value = addCommas(value);

								table += `<td align="${col.name.match(/amount/gi)? 'right': 'left'}">${value}</td>`;
							});
							table += `</tr>`;
						 }

						 tranIds.push(res.getValue({ name: 'tranid' }));
						 totalAmount += parseFloat(res.getValue({ name: 'amountremaining' })) * 100;
					});

					if(daysOverdue !== '' && daysOverdue < 90){
						table += `<tr>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
								</tr>
								<tr>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td>&nbsp;</td>
									<td align="right" style="border-top:1px Solid #000000;">{{totalDue}}</td>
									<td>&nbsp;</td>
								</tr>
							</table>`;
					}
	log.debug('table', table);

					if(!totalAmount)
						return;

					// Get email template
					var paramsTempId = 30;
					if(daysOverdue >= 60 && daysOverdue < 90)
						paramsTempId = 60;
					else if(daysOverdue >= 90)
						paramsTempId = 90;

					var emailTempId = script.getParameter(`custscript_se_sea_${paramsTempId}daysemailtemplate`);
					var emailTemplate = record.load({
						type: 'emailtemplate',
						id: emailTempId
					});

	log.debug('emailTempId', emailTempId);
					var subject = emailTemplate.getValue({ fieldId: 'subject' });
					var body = emailTemplate.getValue({ fieldId: 'content' });
					var isUsesMedia = emailTemplate.getValue({ fieldId: 'usesmedia' });
					if( isUsesMedia == 'T' || isUsesMedia === true )
						body = file.load({
							id: emailTemplate.getValue({ fieldId: 'mediaitem' })
						}).getContents();


					var finalDue = format.parse({ type: format.Type.DATE, value: today });
					finalDue.setDate(finalDue.getDate() + 7);
					finalDue = format.format({ type: format.Type.DATE, value: finalDue });

					// Set company name and address
					var companyname = subsidiaryId == '7'? `Update Inc. dba Innovative Driven`:
						`Innovative Discovery, LLC dba Innovative Driven`;
					var companyaddress = `1700 N Moore St<br />Suite 1500<br />Arlington VA 22209<br />(703) 875-8003<br />`;
					companyaddress += subsidiaryId == '8'? `www.driven-inc.com`: `www.id-edd.com`;
					companyaddress += `<br/>Tax ID # ` + subsidiaryId == '8'? '54-2056355':
						subsidiaryId == '7'? '38-3900189': '82-1628805';

					var mappingData = {
						today,
						billaddress: billAddress.replace('\n','<br />'),
						contactname: contactName,
						invoices: tranIds.join(', '),
						companyname, companyaddress,
						table,
						finalDue,
						totalDue: addCommas((totalAmount/100).toFixed(2)),
					};

					for(var x in mappingData){
						var regExp = new RegExp(`{{${x}}}`, 'gi');
						body = body.replace(regExp, mappingData[x]);
					}

					email.send({
						author, recipients, cc,
						subject, body,
						attachments: [
							getConsolidatedStatement({
								entityId, startDate,
								statementDate: today,
								subsidiaryId, entityIds
							})
						]
					});
				});

				var entGroup = record.load({
					type: 'entitygroup',
					id: context.key
				});
				entGroup.setValue({
					fieldId: 'custentity_lastemailsentdate',
					value: format.parse({ type: format.Type.DATE, value: today })
				});
				entGroup.save();

			}catch(e){
				log.debug('- REDUCE ERROR -', e);
			}

		}


		/**
		 * Executes when the summarize entry point is triggered and applies to the result set.
		 *
		 * @param {Summary} summary - Holds statistics regarding the execution of a map/reduce script
		 * @since 2015.1
		 */
		const summarize = summary => {

		}

		const getConsolidatedStatement = params => {

			var { subsidiaryId, entityId, statementDate, startDate, entityIds } = params;

log.debug('entityIds', entityIds);
			var statementData = {};
			
			// Load subsidiary record
			var subsidiaryRecord = record.load({ type: 'subsidiary', id: subsidiaryId });

			// Get balance aging
			statementData = getBalanceAging( entityId, subsidiaryId, entityIds );

			// Get Amount due
			var balanceDate = format.parse({ type: format.Type.DATE, value: statementDate });
			balanceDate.setDate( balanceDate.getDate() + 1 );
			balanceDate = format.format({ type: format.Type.DATE, value: balanceDate });
			statementData.amountDue = addCommas(((getBalanceForward( entityId, balanceDate, subsidiaryId, entityIds ) || 0)/100).toFixed(2));
			statementData.amountEncl = '';

			// Get subsidiary details
			statementData.subsidiaryid = subsidiaryId;
			statementData.subsidiary = subsidiaryRecord.getValue({ fieldId: 'name' });
			statementData.currency = subsidiaryRecord.getText({ fieldId: 'currency' });

			statementData.trandate = statementDate;
			statementData.lines = getOpenStatementLines( entityId, startDate, statementDate, subsidiaryId, entityIds );

			var statementDataReport = { data: [statementData] };

			var script = runtime.getCurrentScript();
			var tempId = script.getParameter('custscript_se_sea_pdftemplate');

			var pdfTemplate = file.load({ id: tempId }).getContents();

			// ******************************* Load other records needed *******************************
			// Company Information
			var companyInformation = config.load({
				type: config.Type.COMPANY_INFORMATION
			});
			// Customer Record
			var customer = record.load({
				type: 'customer',
				id: entityId
			});

			// ****************************** Generate PDF ********************************
			var pdfRenderer = render.create();
			pdfRenderer.templateContent = pdfTemplate;
			pdfRenderer.addCustomDataSource({
				alias: 'statements',
				format: render.DataSource.OBJECT,
				data: statementDataReport
			});
			pdfRenderer.addRecord({
				templateName: 'company',
				record: companyInformation
			});
			pdfRenderer.addRecord({
				templateName: 'customer',
				record: customer
			});

			var pdfFile = pdfRenderer.renderAsPdf();
			pdfFile.name = `${customer.getValue({ fieldId: 'entityid' })}.pdf`;
			
			return pdfFile;
		}

		const getOpenStatementLines = (entityId, startDate, statementDate, subsidiaryId, entityIds) => {
			var lines = [];
			var balance = '';
			
			// Search for balance
			if(startDate)
				balance = getBalanceForward( entityId, startDate, subsidiaryId, entityIds );

			if(balance != ''){
				lines.push({
					date: startDate,
					description: 'Balance Forward',
					charge: '',
					payment: '',
					balance: addCommas((balance/100).toFixed(2))
				});
			}else
				balance = 0;
			
			// Search for statement lines
			var filters = [
				['accounttype', 'anyof', 'AcctRec'], 'AND',
				['posting', 'is', 'T'], 'AND',
//				['mainline', 'is', 'T'], 'AND',
//				['type', 'anyof', ['CustInvc','CustPymt']], 'AND',
//				[['name', 'anyof', entityId], 'OR', ['customersubof', 'anyof', entityId]], 'AND',
				[
					['name', 'anyof', entityIds], 'OR',
					['job.parent', 'anyof', entityIds]
				], 'AND',
				['subsidiary', 'anyof', [subsidiaryId]], 'AND',
				['amountremaining', 'notequalto', '0']
			];
			if(startDate && statementDate)
				filters.push('AND',['trandate', 'within', [startDate, statementDate]]);
			else
				filters.push('AND', ['trandate', 'onorbefore', statementDate]);

			lines = lines.concat(getAllSSResult(search.create({
				type: 'transaction',
				filters,
				columns: [
					{ name: 'trandate', sort: search.Sort.ASC},
					{ name: 'companyname', join: 'customer' },
					{ name: 'type' },
					{ name: 'tranid' },
					{ name: 'amount' },
					{ name: 'amountremaining' }
				]
			}).run()).map(res=>{
				var cols = res.columns;
				var amt = (parseFloat(res.getValue(cols[4])) || 0) * 100;
				var amount = (parseFloat(res.getValue(cols[5])) || 0) * 100;
				var amountTxt = addCommas(res.getValue(cols[5]).replace('-',''));

				if(amt<0)
					amount *= -1;

				balance += amount;

				return {
					date: res.getValue(cols[0]),
					entity: res.getValue(cols[1]),
					description: `${res.getText(cols[2])} #${res.getValue(cols[3])}`,
					charge: amount > 0? amountTxt: '',
					payment: amount < 0? amountTxt: '',
					balance: addCommas((balance/100).toFixed(2))
				};

			}));

			if(!lines.length && startDate)
				lines.push({
					date: startDate,
					description: 'Balance Forward',
					charge: '',
					payment: '',
					balance: '0.00'
				});

			return lines;
		}

		const getBalanceAging = (entityId, subsidiaryId, entityIds) => {
			var agingData = {};
			search.create({
				type: 'transaction',
				filters: [
					["accounttype","anyof","AcctRec"], "AND", 
					["posting","is","T"], "AND", 
					["amountremaining","notequalto","0.00"], "AND", 
					["subsidiary","anyof",subsidiaryId], "AND",
//					[["name","anyof",entityId],"OR",["customersubof","anyof",entityId]]
					[
						['name', 'anyof', entityIds], 'OR',
						['job.parent', 'anyof', entityIds]
					]
				],
				columns: [
					{
						name: 'formulacurrency',
						summary: search.Summary.SUM,
						formula: `Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) < 1 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) < 1 then {amountremaining} else 0 end`
					}, {
						name: 'formulacurrency',
						summary: search.Summary.SUM,
						formula: `Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 1 and 30 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 1 and 30 then {amountremaining} else 0 end`
					}, {
						name: 'formulacurrency',
						summary: search.Summary.SUM,
						formula: `Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 31 and 60 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 31 and 60 then {amountremaining} else 0 end`
					}, {
						name: 'formulacurrency',
						summary: search.Summary.SUM,
						formula: `Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 61 and 90 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 61 and 90 then {amountremaining} else 0 end`
					}, {
						name: 'formulacurrency',
						summary: search.Summary.SUM,
						formula: `Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) > 90 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) > 90 then {amountremaining} else 0 end `
					}, {
						name: 'formulacurrency',
						summary: search.Summary.SUM,
						formula: `(Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) < 1 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) < 1 then {amountremaining} else 0 end)+ (Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 1 and 30 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 1 and 30 then {amountremaining} else 0 end) + (Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 31 and 60 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 31 and 60 then {amountremaining} else 0 end) + (Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 61 and 90 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) between 61 and 90 then {amountremaining} else 0 end) + (Case When substr({amount},1,1) = '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) > 90 then ({amountremaining}*-1) When substr({amount},1,1) <> '-' and (NVL({daysoverdue}, Round({today}-{trandate}, 0))) > 90 then {amountremaining} else 0 end)`
					}
				]
			}).run().getRange(0,1).forEach(res=>{
				var ids = ['aging1', 'aging2', 'aging3', 'aging4', 'aging5', 'agingbal'];

				res.columns.forEach((col,i)=>{
					agingData[ids[i]] = addCommas(parseFloat(res.getValue(col) || 0).toFixed(2));
				});
			});

			return agingData;
		}

		const getBalanceForward = (entityId, startDate, subsidiaryId, entityIds) => {
log.debug('getBalanceForward entityIds', entityIds);
			var balance = '';

			search.create({
				type: 'transaction',
				filters: [
					['accounttype', 'anyof', 'AcctRec'], 'AND',
					['posting', 'is', 'T'], 'AND',
//					['type', 'anyof',
//						['CashRfnd','CustCred','CustDep','CustRfnd','CustInvc','Journal','CustPymt']], 'AND',
//					[['name', 'anyof', entityId], 'OR', ['customersubof', 'anyof', entityId]], 'AND',
					[
						['name', 'anyof', entityIds], 'OR',
						['job.parent', 'anyof', entityIds]
					], 'AND',
					['subsidiary', 'anyof', [subsidiaryId]], 'AND',
					['trandate', 'before', startDate]
				],
				columns: [{ name: 'amount', summary: search.Summary.SUM }]
			}).run().getRange(0,1).forEach(res=>{
				balance = res.getValue(res.columns[0]);
				balance = balance != ''? ((parseFloat(balance) || 0)*100): '';
			});
			
			return balance;
		}

		const getAllSSResult = searchResultSet => {
			var result = [];
			for(var x=0;x<=result.length;x+=1000)
				result = result.concat(searchResultSet.getRange(x,x+1000)||[]);
			return result;
		};

		const addCommas = x => {
			var parts = x.toString().split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
		}

		return {
			getInputData,
			map,
			reduce,
			summarize
		};
		
	});
