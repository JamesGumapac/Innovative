/**
 * @NApiVersion 2.1
 */
define(['N/email', 'N/runtime', 'N/file'],
    /**
 * @param{email} email
 * @param{runtime} runtime
 * @param{file} file
 */
    function (email, runtime, file) {

        function sendEmailNotifError (objWebhookRaw, errorMsg) {
            
            var author = runtime.getCurrentUser().id;
            var recipient = [6616] // Brian = 6617 and Marc = 6616 for now NEED TO UPDATE THIS!!
            var subject = "CardConnect HPP Error: Invalid Webhook Payload was received";

            var emailObj = {
                author: author,
                recipients: recipient,
                subject: subject,
                body: "",
                attachments: []
            };

            try{
                if(objWebhookRaw){
                    var timeStamp = new Date().toISOString();
                    var fileName = "webhook_payload_"+timeStamp+".txt";

                    var fileObj = file.create({
                        name: fileName,
                        fileType: file.Type.PLAINTEXT,
                        contents: objWebhookRaw,
                        encoding: file.Encoding.UTF8,
                        folder: 835, // PATH = SuiteScripts/Logs
                    });

                    emailObj.attachments = [fileObj];
                    emailObj.body = "Please see attached file for RAW WEBHOOK PAYLOAD.\n\n"
                }

                emailObj.body += errorMsg;

                email.send(emailObj);

                log.debug("EMAIL NOTIF SUCCESSFULLY SENT");
                log.error("EMAIL NOTIF SUCCESSFULLY SENT");
            }catch(e){
                log.debug("FAILED TO SEND EMAIL NOTIF", e);
                log.error("FAILED TO SEND EMAIL NOTIF", e);
            }
        }

        function createPaymentEvent () {
            
        }

        return {sendEmailNotifError: sendEmailNotifError}

    });
