/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope SameAccount
 * @NAuthor Jerome Morden
 *
 * @NFileName se_sl_customConsolidatedStatement
 */
define(['N/config', 'N/file', 'N/format', 'N/record', 'N/render', 'N/runtime', 'N/search', 'N/ui/serverWidget', 'N/xml'],

	(config, file, format, record, render, runtime, search, ui, xml) => {

		/**
		 * Definition of the Suitelet script trigger point.
		 *
		 * @param {Object} context
		 * @param {ServerRequest} context.request - Encapsulation of the incoming request
		 * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
		 * @Since 2015.2
		 */
		const onRequest = context => {
			var { request, response } = context;

			if (request.method == 'GET')
				getRequest(context);
			else
				postRequest(context);
		}

		const getRequest = context => {
			var { request, response } = context;

			var form = ui.createForm({ title: 'Print Consolidated Statement' });

			// Fields
			var fields = {};
			([
				//['id', 'label', 'type', 'source'],
				['customer', 'Parent Customer', 'SELECT'],
				['subsidiary', 'Subsidiary', 'SELECT'],
				['statementdate', 'Statement Date', 'DATE'],
				['startdate', 'Start Date', 'DATE'],
				['openonly', 'Show Only Open Transactions', 'CHECKBOX']
			]).forEach(fld => {
				fields[fld[0]] = form.addField({
					id: `custpage_${fld[0]}`,
					label: fld[1],
					type: ui.FieldType[fld[2]],
					source: fld[3] || null
				});
			});

			// Set field to mandatory
			fields.statementdate.isMandatory = true;
			fields.subsidiary.isMandatory = true;
			fields.customer.isMandatory = true;

			// Set field default value
			// Statement Date
			var date = new Date();
			fields.statementdate.defaultValue = date;
			// Start Date
			date.setMonth(date.getMonth() - 1);
			fields.startdate.defaultValue = date;
			// Open Only
			fields.openonly.defaultValue = 'T';

			// Add customer options
			fields.customer.addSelectOption({ value: '', text: '' });
			getAllSSResult(search.create({
				type: 'customer',
				filters: [
					['stage', 'anyof', 'CUSTOMER'], 'AND',
					['isinactive', 'is', 'F'], 'AND',
					['parentcustomer.internalid', 'anyof', '@NONE@']
				],
				columns: [{ name: 'entityid', sort: search.Sort.ASC }]
			}).run()).forEach(res => {
				fields.customer.addSelectOption({
					value: res.id,
					text: res.getValue(res.columns[0])
				});
			});

			// Buttons
			form.addSubmitButton({
				id: 'custpage_btn_print',
				label: 'Print Statement'
			});
			form.addButton({
				id: 'custpage_btn_cancel',
				label: 'Cancel',
				functionName: '(function(){ window.history.back(); })()'
			});

			form.clientScriptModulePath = './se_cs_customConsStatement';

			response.writePage(form);
		}

		const postRequest = context => {
			var { request, response } = context;

			var params = request.parameters;

			var subsidiaryIds = params.custpage_subsidiary.match(/,/gi) ?
				params.custpage_subsidiary.split(',') : [params.custpage_subsidiary];
			var entityId = parseInt(params.custpage_customer);
			var startDate = params.custpage_startdate;
			var statementDate = params.custpage_statementdate;
			var openTransactionsOnly = params.custpage_openonly == 'T' ? true : false;
			log.debug('params', params);
			/*
						var subsIds = getAllSSResult( search.create({
							type: 'customer',
							filters: [['parent', 'anyof', entityId], 'AND',
								['stage', 'anyof', 'CUSTOMER']]
						}).run() ).map(res=>{
							return res.id;
						});
			
						if(!subsIds.length){
							var pdfFile = render.statement({
								entityId, startDate, statementDate,
								openTransactionsOnly, subsidiaryId,
								printMode: render.PrintMode.PDF,
								consolidateStatements: true,
			//					formId: 81
							});
							pdfFile.name = 'Consolidated Statement.pdf';
							response.writeFile( pdfFile, true );
							return;
						}
			*/
			// ********************************** Cutting the process here as the statement generated are completed already by using consolidated statement flag is checked. *********************************************************

			var statementDataReport = { data: [] };
			subsidiaryIds.forEach(subsidiaryId => {
				var statementData = {};

				// Load subsidiary record
				var subsidiaryRecord = record.load({ type: 'subsidiary', id: subsidiaryId });

				// Get balance aging
				statementData = getBalanceAging(entityId, subsidiaryId);

				// Get Amount due
				var balanceDate = format.parse({ type: format.Type.DATE, value: statementDate });
				balanceDate.setDate(balanceDate.getDate() + 1);
				balanceDate = format.format({ type: format.Type.DATE, value: balanceDate });
				statementData.amountDue = addCommas(((getBalanceForward(entityId, balanceDate, subsidiaryId) || 0) / 100).toFixed(2));
				statementData.amountEncl = '';

				// Get subsidiary details
				statementData.subsidiary = subsidiaryRecord.getValue({ fieldId: 'name' });
				statementData.currency = subsidiaryRecord.getText({ fieldId: 'currency' });

				statementData.trandate = statementDate;
				if (openTransactionsOnly)
					statementData.lines = getOpenStatementLines(entityId, startDate, statementDate, subsidiaryId);
				else
					statementData.lines = getStatementLines(entityId, startDate, statementDate, subsidiaryId);


				statementDataReport.data.push(statementData);
			});

			file.create({
				name: 'logsStatement.txt',
				fileType: file.Type.PLAINTEXT,
				contents: JSON.stringify(statementDataReport),
				folder: '8125'
			}).save();

			// Load PDF Template
			var script = runtime.getCurrentScript();
			var tempId = script.getParameter('custscript_consolidatedstatement_tempid');
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

			log.debug({
				title: 'statementDataReport',
				details: statementDataReport
			})
			log.debug({
				title: 'customer',
				details: customer
			})
			log.debug({
				title: 'company',
				details: companyInformation
			})

			var statementPdf = pdfRenderer.renderAsPdf();
			response.writeFile(statementPdf, true);
		}

		const getBalanceAging = (entityId, subsidiaryId) => {
			var agingData = {};
			search.create({
				type: 'transaction',
				filters: [
					["accounttype", "anyof", "AcctRec"], "AND",
					["posting", "is", "T"], "AND",
					["amountremaining", "notequalto", "0.00"], "AND",
					["subsidiary", "anyof", subsidiaryId], "AND",
					[["name", "anyof", entityId], "OR", ["customersubof", "anyof", entityId]]
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
			}).run().getRange(0, 1).forEach(res => {
				var ids = ['aging1', 'aging2', 'aging3', 'aging4', 'aging5', 'agingbal'];

				res.columns.forEach((col, i) => {
					agingData[ids[i]] = addCommas(parseFloat(res.getValue(col) || 0).toFixed(2));
				});
			});

			return agingData;
		}

		const getBalanceForward = (entityId, startDate, subsidiaryId) => {
			var balance = '';

			search.create({
				type: 'transaction',
				filters: [
					['accounttype', 'anyof', 'AcctRec'], 'AND',
					['posting', 'is', 'T'], 'AND',
					//					['type', 'anyof',
					//						['CashRfnd','CustCred','CustDep','CustRfnd','CustInvc','Journal','CustPymt']], 'AND',
					[['name', 'anyof', entityId], 'OR', ['customersubof', 'anyof', entityId]], 'AND',
					['subsidiary', 'anyof', [subsidiaryId]], 'AND',
					['trandate', 'before', startDate]
				],
				columns: [{ name: 'amount', summary: search.Summary.SUM }]
			}).run().getRange(0, 1).forEach(res => {
				balance = res.getValue(res.columns[0]);
				balance = balance != '' ? ((parseFloat(balance) || 0) * 100) : '';
			});

			return balance;
		}

		const getStatementLines = (entityId, startDate, statementDate, subsidiaryId) => {
			var lines = [];
			var balance = '';

			// Search for balance
			if (startDate)
				balance = getBalanceForward(entityId, startDate, subsidiaryId);

			if (balance != '') {
				lines.push({
					date: startDate,
					description: 'Balance Forward',
					charge: '',
					payment: '',
					balance: addCommas((balance / 100).toFixed(2))
				});
			} else
				balance = 0;

			// Search for statement lines
			var filters = [
				['accounttype', 'anyof', 'AcctRec'], 'AND',
				['posting', 'is', 'T'], 'AND',
				//				['type', 'anyof', ['CashRfnd','CustCred','CustDep','CustRfnd','CustInvc','Journal','CustPymt']], 'AND',
				[['name', 'anyof', entityId], 'OR', ['customersubof', 'anyof', entityId]], 'AND',
				['subsidiary', 'anyof', [subsidiaryId]], 'AND',
				['amount', 'notequalto', '0']
			];
			if (startDate && statementDate)
				filters.push('AND', ['trandate', 'within', [startDate, statementDate]]);
			else
				filters.push('AND', ['trandate', 'onorbefore', statementDate]);

			lines = lines.concat(getAllSSResult(search.create({
				type: 'transaction',
				filters,
				columns: [
					{ name: 'trandate', sort: search.Sort.ASC },
					{ name: 'companyname', join: 'customer' },
					{ name: 'type' },
					{ name: 'tranid' },
					{ name: 'amount' }
				]
			}).run()).map(res => {
				var cols = res.columns;
				var amount = (parseFloat(res.getValue(cols[4])) || 0) * 100;
				var amountTxt = addCommas(res.getValue(cols[4]).replace('-', ''));

				balance += amount;

				return {
					date: res.getValue(cols[0]),
					entity: res.getValue(cols[1]).replace(/&/g, "&amp;"),
					description: `${res.getText(cols[2])} #${res.getValue(cols[3])}`,
					charge: amount > 0 ? amountTxt : '',
					payment: amount < 0 ? amountTxt : '',
					balance: addCommas((balance / 100).toFixed(2))
				};
			}));

			if (!lines.length && startDate)
				lines.push({
					date: startDate,
					description: 'Balance Forward',
					charge: '',
					payment: '',
					balance: '0.00'
				});

			return lines;
		}

		const getOpenStatementLines = (entityId, startDate, statementDate, subsidiaryId) => {
			var lines = [];
			var balance = '';

			// Search for balance
			if (startDate)
				balance = getBalanceForward(entityId, startDate, subsidiaryId);

			if (balance != '') {
				lines.push({
					date: startDate,
					description: 'Balance Forward',
					charge: '',
					payment: '',
					balance: addCommas((balance / 100).toFixed(2))
				});
			} else
				balance = 0;

			// Search for statement lines
			var filters = [
				['accounttype', 'anyof', 'AcctRec'], 'AND',
				['posting', 'is', 'T'], 'AND',
				//				['mainline', 'is', 'T'], 'AND',
				//				['type', 'anyof', ['CustInvc','CustPymt']], 'AND',
				[['name', 'anyof', entityId], 'OR', ['customersubof', 'anyof', entityId]], 'AND',
				['subsidiary', 'anyof', [subsidiaryId]], 'AND',
				['amountremaining', 'notequalto', '0']
			];
			if (startDate && statementDate)
				filters.push('AND', ['trandate', 'within', [startDate, statementDate]]);
			else
				filters.push('AND', ['trandate', 'onorbefore', statementDate]);

			lines = lines.concat(getAllSSResult(search.create({
				type: 'transaction',
				filters,
				columns: [
					{ name: 'trandate', sort: search.Sort.ASC },
					{ name: 'companyname', join: 'customer' },
					{ name: 'type' },
					{ name: 'tranid' },
					{ name: 'amount' },
					{ name: 'amountremaining' }
				]
			}).run()).map(res => {
				var cols = res.columns;
				var amt = (parseFloat(res.getValue(cols[4])) || 0) * 100;
				var amount = (parseFloat(res.getValue(cols[5])) || 0) * 100;
				var amountTxt = addCommas(res.getValue(cols[5]).replace('-', ''));

				if (amt < 0)
					amount *= -1;

				balance += amount;

				return {
					date: res.getValue(cols[0]),
					entity: res.getValue(cols[1]).replace(/&/g, "&amp;"),
					description: `${res.getText(cols[2])} #${res.getValue(cols[3])}`,
					charge: amount > 0 ? amountTxt : '',
					payment: amount < 0 ? amountTxt : '',
					balance: addCommas((balance / 100).toFixed(2))
				};

			}));

			if (!lines.length && startDate)
				lines.push({
					date: startDate,
					description: 'Balance Forward',
					charge: '',
					payment: '',
					balance: '0.00'
				});

			return lines;
		}

		const parseStatement = html => {

			html = html.replace(/<meta.*?>|<br>|<p>|<\/p>|<img.*?>|&nbsp;/gi, '');
			html.match(/<.*?>/gi).forEach(tag => {
				var tagName = tag.split(' ');
				tagName = tagName.length > 1 ? tagName[0] + '>' : tagName[0];
				html = html.replace(tag, tagName)
			});
			html += '</body></html>';

			var document = xml.Parser.fromString({
				text: html
			});

			// Get header field values
			var headerFields = {};
			// Summary
			headerFields.amountDue = document.getElementsByTagName('table')[2].getElementsByTagName('tr')[2].getElementsByTagName('td')[2].textContent;
			headerFields.amountEncl = document.getElementsByTagName('table')[2].getElementsByTagName('tr')[3].getElementsByTagName('td')[2].textContent;
			headerFields.currency = document.getElementsByTagName('table')[2].getElementsByTagName('tr')[4].getElementsByTagName('td')[2].textContent;
			headerFields.subsidiary = document.getElementsByTagName('table')[2].getElementsByTagName('tr')[5].getElementsByTagName('td')[2].textContent;

			// Aging
			var aging = document.getElementsByTagName('table')[4].getElementsByTagName('tr')[1].getElementsByTagName('td');
			for (var x = 0; x < aging.length; x++) {
				var value = aging[x].textContent;

				if (x > 4)
					headerFields.agingbal = value;
				else
					headerFields[`aging${x + 1}`] = value;
			}


			// Get lines
			var journals = [];
			var otherTrans = [];
			var linesData = [];
			var lineColumns = ['date', 'description', 'charge', 'payment', 'balance'];
			var lines = document.getElementsByTagName('table')[3].getElementsByTagName('tr');
			for (var x = 1; x < lines.length; x++) {
				var data = {};
				var tds = lines[x].getElementsByTagName('td');
				for (var y = 0; y < tds.length; y++) {
					var value = tds[y].textContent || '';

					//					if(lineColumns[y].match(/charge|payment|balance/gi)) // (x > 1)
					//						value = parseFloat(value.replace(/[^0-9\.\-]/gi,'')) || 0;

					data[lineColumns[y]] = value;

					if (lineColumns[y] == 'description' && x > 1) {
						var tranId = value;

						if (tranId.match(/journal/gi)) {
							tranId = tranId.replace(/.*?#/gi, '')

							if (journals.indexOf(tranId) < 0)
								journals.push(tranId);
						} else {
							tranId = tranId.replace(/.*?#/gi, '')

							if (otherTrans.indexOf(tranId) < 0)
								otherTrans.push(tranId);
						}
					}
				}
				linesData.push(data);
			}

			headerFields.lines = linesData;
			headerFields.journals = journals;
			headerFields.otherTrans = otherTrans;

			return headerFields;

		}

		// Get all saved search results.
		const getAllSSResult = searchResultSet => {
			var result = [];
			for (var x = 0; x <= result.length; x += 1000)
				result = result.concat(searchResultSet.getRange(x, x + 1000) || []);
			return result;
		}

		const addCommas = x => {
			var parts = x.toString().split(".");
			parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
			return parts.join(".");
		}

		return {
			onRequest
		};

	});
