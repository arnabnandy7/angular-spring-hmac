import {Injectable} from '@angular/core';
import {Response,Headers,Http} from '@angular/http';
import 'rxjs/add/operator/map';
import {Account} from '../account/account';
import {AccountEventsService} from '../account/account.events.service';
import {SecurityToken} from '../security/securityToken';
import {Observable} from 'rxjs/Observable';
import * as AppUtils from '../utils/app.utils';
import {Router} from '@angular/router';

@Injectable()
export class LoginService {
    constructor(private http:Http,private accountEventService:AccountEventsService,private router: Router) {
    }
    authenticate(username:string,password:string, rememberMe: boolean):Observable<Account> {

        let headers = new Headers();
        headers.append('Content-Type', 'application/json');

        return this.http.post(AppUtils.BACKEND_API_ROOT_URL+AppUtils.BACKEND_API_AUTHENTICATE_PATH,
            JSON.stringify({login:username,password:password}),{headers:headers})
            .map((res:Response) => {
                let securityToken:SecurityToken = new SecurityToken(
                    {
                        secret:res.headers.get(AppUtils.HEADER_X_SECRET),
                        securityLevel:res.headers.get(AppUtils.HEADER_WWW_AUTHENTICATE)
                    }
                );

                if(rememberMe) {
                    localStorage.setItem(AppUtils.STORAGE_ACCOUNT_TOKEN, res.text());
                    localStorage.setItem(AppUtils.STORAGE_SECURITY_TOKEN, JSON.stringify(securityToken));
                } else {
                    sessionStorage.setItem(AppUtils.STORAGE_ACCOUNT_TOKEN, res.text());
                    sessionStorage.setItem(AppUtils.STORAGE_SECURITY_TOKEN, JSON.stringify(securityToken));
                }

                let account:Account = new Account(res.json());
                this.sendLoginSuccess(account);
                return account;
            })
    }
    sendLoginSuccess(account?:Account):void {
        if(!account) {
            account = new Account(JSON.parse(this.getAccountFromStorage()));
        }
        this.accountEventService.loginSuccess(account);
    }
    isAuthenticated():boolean {
        return !!this.getAccountFromStorage();
    }
    removeAccount():void {
        localStorage.removeItem(AppUtils.STORAGE_ACCOUNT_TOKEN);
        localStorage.removeItem(AppUtils.STORAGE_SECURITY_TOKEN);

        sessionStorage.removeItem(AppUtils.STORAGE_ACCOUNT_TOKEN);
        sessionStorage.removeItem(AppUtils.STORAGE_SECURITY_TOKEN);
    }
    logout():void {
        console.log('Logging out', AppUtils.BACKEND_API_ROOT_URL+AppUtils.BACKEND_API_LOGOUT_PATH);

        this.http.post(AppUtils.BACKEND_API_ROOT_URL+AppUtils.BACKEND_API_LOGOUT_PATH, null)
            .subscribe(() => {
                this.http.get(AppUtils.BACKEND_API_ROOT_URL+AppUtils.BACKEND_API_AUTHENTICATE_PATH)
                    .subscribe(() => {
                        this.removeAccount();
                        this.router.navigate(['/authenticate']);
                    });
            });
    }
    isAuthorized(roles:Array<string>):boolean {
        if(this.isAuthenticated() && roles) {
            let account:Account = new Account(JSON.parse(this.getAccountFromStorage()));
            if(account && account.profile) {
                let isValid = true;
                roles.forEach((role:string) => {
                    let filteredAuth: Array<any> = account.profile.authorities.filter(a => {
                        return a.name === role;
                    });

                    if(filteredAuth.length === 0) {
                        isValid = false;
                    }
                });

                return isValid;
            }
        }
        return false;
    }
    getAccountFromStorage(): any {
        let account: any = localStorage.getItem(AppUtils.STORAGE_ACCOUNT_TOKEN);
        if(!account) {
            return sessionStorage.getItem(AppUtils.STORAGE_ACCOUNT_TOKEN);
        }
        return account;
    }
}
