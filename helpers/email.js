var nodemailer = require("nodemailer");
var smtpTransport = nodemailer.createTransport("SMTP", {
    service: "Mailgun",
    auth: {
        user: "notify@stackignite.com",
        pass: "pass"
    }
});

exports.sendEmail = function(req, res) {
	if (req.params.to &&
		req.params.subject &&
		req.params.text &&
		req.params.html) {

		var mailOptions = {
		    from: "StackIgnite Notifications <notify@stackignite.com>",
		    to: req.params.to,
		    subject: req.params.subject,
		    text: req.params.text,
		    html: req.params.html,
		}

		// send mail with defined transport object
		smtpTransport.sendMail(mailOptions, function(error, response){
		    if (error){
		        console.log(error);
		    } else{
		        console.log("Message sent: " + response.message);
		    }

		    smtpTransport.close();
		});

	}
}
