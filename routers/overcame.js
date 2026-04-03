const {Router} = require("express");
const router = Router();

router.get("/patient" , (req,res)=>{
    res.render("overcame" , {title:"Stories"})
})

module.exports = router;