const {Router} = require("express");
const router = Router();
const User = require("../models/user");
const { createHmac } = require("crypto");
const { createTokenForUser,validateToken } = require("../services/authentication");

router.get("/signup", (req,res)=>{
    return res.render("signup" , {
        title: "Sign Up"
    });
});

router.get("/signin", (req,res)=>{
    return res.render("signin" , 
            {title: "Sign In"}
    );
});

router.post("/signup", async (req, res) => {
    const {fullName, email, password, age, gender} = req.body;
    
    //console.log("BODY:", req.body);          // ← check form data
    
    const user = await User.create({fullName, email, password, age, gender});
    
    //console.log("USER CREATED:", user);      // ← check saved user
    //console.log("FULLNAME:", user.fullName); // ← check specifically fullName

    const token = createTokenForUser(user);
    //console.log("TOKEN PAYLOAD:", require("jsonwebtoken").decode(token)); // ← check token

    return res.cookie("token", token).redirect("/");
});

router.post("/signin", async (req,res)=>{
    const {email,password} = req.body;
    if( !email || !password)
    {
        return res.redirect("/user/signin?error=missingSignin",)
    }
    const user = await User.findOne({ email });
    if(!user) return res.redirect("/signup");

    const hashedPassword = createHmac("sha256",user.salt).update(password).digest("hex");
    if(hashedPassword != user.password)
        return res.render("signin",{error : "Invalid password"});
    
    const token = createTokenForUser(user);
    return res.cookie("token",token).redirect("/");
    

});
router.get("/logout", (req,res)=>{
    res.clearCookie("token")
    return res.redirect("/user/signin");
});

module.exports = router;