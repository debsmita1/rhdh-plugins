/*
 * Copyright Red Hat, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const isValidCountryCode = (countryCode: string) =>
  /^[+]?[0-9]+$/.test(countryCode);
export const isValidPhoneNumber = (phoneNumber: string) =>
  /^[(]?[0-9]+[)]?[-\s.]?[0-9]+[-\s./0-9]*$/im.test(phoneNumber);
export const isValidOTP = (otp: string) => /^[a-zA-Z0-9]*$/.test(otp);
