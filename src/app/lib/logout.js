const logout = async()=>{

   await api.post(
      "/api/auth/logout"
   );

   localStorage.removeItem(
      "accessToken"
   );

   router.push(
      "/login"
   );

};