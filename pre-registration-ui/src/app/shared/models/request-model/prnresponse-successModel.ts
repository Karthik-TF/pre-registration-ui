export interface PRNResponseSuccessModel {
    data:{
        prn: string;
        searchCode: string;
        errorCode: string;
        errorDesc: string;
        expiryDate: string;
        amount:string
    }
    
   }
