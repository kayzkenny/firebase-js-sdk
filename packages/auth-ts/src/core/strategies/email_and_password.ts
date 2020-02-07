/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Auth } from '../../model/auth';
import { UserCredential, OperationType } from '../../model/user_credential';
import { User } from '../../model/user';
import * as api from '../../api/authentication';
import { EmailAuthProvider } from '../providers/email';
import { initializeCurrentUserFromIdTokenResponse } from '.';
import {
  setActionCodeSettingsOnRequest,
  ActionCodeSettings
} from '../../model/action_code_settings';
import { signInWithCredential } from './auth_credential';
import { resetPassword } from '../../api/account_management';
import {
  ActionCodeInfo,
  actionCodeInfoFromResetPasswordResponse
} from '../../model/action_code_info';

export async function createUserWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  const response = await api.signUp(auth, {
    returnSecureToken: true,
    email,
    password
  });
  const user = await initializeCurrentUserFromIdTokenResponse(auth, response);
  return new UserCredential(
    user,
    EmailAuthProvider.PROVIDER_ID,
    OperationType.SIGN_IN
  );
}

export async function signInWithEmailAndPassword(
  auth: Auth,
  email: string,
  password: string
): Promise<UserCredential> {
  return signInWithCredential(
    auth,
    EmailAuthProvider.credential(email, password)
  );
}

export async function sendEmailVerification(
  auth: Auth,
  user: User,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const idToken = await user.getIdToken();
  const request: api.VerifyEmailRequest = {
    requestType: api.GetOobCodeRequestType.VERIFY_EMAIL,
    idToken
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  const response = await api.sendOobCode(auth, request);

  if (response.email !== user.email) {
    await user.reload();
  }
}

export async function sendPasswordResetEmail(
  auth: Auth,
  email: string,
  actionCodeSettings?: ActionCodeSettings
): Promise<void> {
  const request: api.PasswordResetRequest = {
    requestType: api.GetOobCodeRequestType.PASSWORD_RESET,
    email
  };
  if (actionCodeSettings) {
    setActionCodeSettingsOnRequest(request, actionCodeSettings);
  }

  await api.sendOobCode(auth, request);
}

export async function confirmPasswordReset(
  auth: Auth,
  oobCode: string,
  newPassword: string
): Promise<void> {
  await resetPassword(auth, {
    oobCode,
    newPassword
  });
  // Do not return the email.
}

// verifyBeforeUpdateEmail

export async function checkActionCode(
  auth: Auth,
  oobCode: string
): Promise<ActionCodeInfo> {
  let response = await resetPassword(auth, {
    oobCode
  });
  return actionCodeInfoFromResetPasswordResponse(auth, response);
}

export async function verifyPasswordResetCode(
  auth: Auth,
  code: string
): Promise<string> {
  const info: ActionCodeInfo = await checkActionCode(auth, code);

  return info.data.email;
}