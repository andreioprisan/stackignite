var util = require('util'),
    mongo = require('mongodb'),
    _ = require('lodash'),
    request = require('request'),
    db_helper = require('../../helpers/db'),
    crypto = require('crypto');

exports.checkLogin = function(req, res) {
  db_helper.dbConnect(["users", "tenants_users"]);
  db.collection('users', function(err, collection) {
    collection.findOne(
      { email: req.body.username, 
        pass: crypto.createHmac('sha256', process.env.globalSecret).update(req.body.password).digest('hex') }, 
      function(err2, results) {
        if (!err2 && results != null && results.uid != null && results.uid != undefined) {
          db.collection('tenants_users', function(err, collection) {
            collection.findOne({ uid: results.uid }, 
              function(err3, results2) {
                if (err2 == null && err3 == null &&
                    results != null && results2 != null &&
                    results.email != undefined && 
                    results.uid != undefined &&
                    results2.tenantId != undefined) 
                {

                  var cryptoCipher = crypto.createCipher('aes-256-cbc', process.env.globalSecret);
                  var encrypted = cryptoCipher.update("{uid: '"+ results.uid + "', tid: '"+results2.tenantId+"'}", 'utf8', 'hex')
                  encrypted += cryptoCipher.final('hex')

                  req.session.uid = encrypted;                
                  valid = true;
                  res.send({ sessionKey: encrypted, success: 1 });
                } else {
                  res.send({ sessionKey: 0, success: 0 })
                }

              });
          });
        } else {
          res.send({ sessionKey: 0, success: 0 })          
        }
    });
  }); 
}

exports.getSessionData = function(req,res) {
  if (req.session.uid === undefined) {
    res.redirect('/');
    return;
  }

  var decipher = crypto.createDecipher('aes-256-cbc', process.env.globalSecret);
  var sess = decipher.update(req.session.uid, 'hex', 'utf8')
  sess += decipher.final('utf8')
  eval("var session_obj = " + sess + ";");

  return {uid: session_obj['uid'], tid: parseInt(session_obj['tid'])};
}
