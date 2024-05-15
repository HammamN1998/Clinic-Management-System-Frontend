import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpResponse,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HTTP_INTERCEPTORS,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { User } from '../models/user';
import { Role } from '../models/role';

const users: User[] = [
  {
    id: '1',
    email: 'admin@hospital.org',
    img: 'assets/images/user/admin.jpg',
    name: 'admin@hospital.org',
    role: Role.Admin,
    token: 'admin-token',
  },
  {
    id: '2',
    email: 'doctor@hospital.org',
    img: 'assets/images/user/doctor.jpg',
    name: 'doctor@hospital.org',
    role: Role.Doctor,
    token: 'doctor-token',
  },
  {
    id: '3',
    email: 'patient@hospital.org',
    img: 'assets/images/user/patient.jpg',
    name: 'patient@hospital.org',
    role: Role.Patient,
    token: 'patient-token',
  },
];

@Injectable()
export class FakeBackendInterceptor implements HttpInterceptor {
  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    const { url, method, headers, body } = request;
    // wrap in delayed observable to simulate server api call
    return of(null).pipe(mergeMap(handleRoute));

    function handleRoute() {
      switch (true) {
        case url.endsWith('/authenticate') && method === 'POST':
          return authenticate();
        default:
          // pass through any requests not handled above
          return next.handle(request);
      }
    }

    // route functions

    function authenticate() {
      const { email, password } = body;
      const user = users.find(
        (x) => x.email === email
      );
      if (!user) {
        return error('Username or password is incorrect');
      }
      return ok({
        id: user.id,
        email: user.email,
        img: user.img,
        name: user.name,
        role: user.role,
        token: user.token,
      });
    }

    // helper functions

    function ok(body?: {
      id: string;
      email: string,
      img: string;
      name: string;
      role: Role;
      token: string;
    }) {
      return of(new HttpResponse({ status: 200, body }));
    }

    function error(message: string) {
      return throwError({ error: { message } });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function unauthorized() {
      return throwError({ status: 401, error: { message: 'Unauthorised' } });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function isLoggedIn() {
      return headers.get('Authorization') === 'Bearer fake-jwt-token';
    }
  }
}

export const fakeBackendProvider = {
  // use fake backend in place of Http service for backend-less development
  provide: HTTP_INTERCEPTORS,
  useClass: FakeBackendInterceptor,
  multi: true,
};
