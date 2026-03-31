const {validateToken} = require("../services/authentication");

function checkForCookieAuthentication(cookieName) {
    return (req,res,next)=>{
        const cookieTokenValue = req.cookies[cookieName];
        if(!cookieTokenValue)
        {
             res.locals.user = null; 
           return next();
        }
        try {
            const payload = validateToken(cookieTokenValue);
            req.user = payload;
             res.locals.user = payload;
        } catch (error) {
             res.locals.user = null;
        }
       return next();
    };
}

function isLoggedIn(req, res, next) {
    if (req.user) {   // or req.user if using passport
        return next();
    }
    return res.redirect("/user/signin"); // redirect if not logged in
}


module.exports = {checkForCookieAuthentication , isLoggedIn};