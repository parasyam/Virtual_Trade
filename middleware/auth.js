const {getUser}=require('../service/auth')


async function cheackAuth(req,res,next){
    const userUid=req.cookies.uid;
    // if (!userUid) {
    //     return res.redirect('/login');
    // }
    const user=await getUser(userUid);
    req.user=user;
    next();

}

module.exports= {cheackAuth}