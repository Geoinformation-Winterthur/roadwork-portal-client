/**
 * @author Edgar Butwilowski
 * @copyright Copyright (c) Vermessungsamt Winterthur. All rights reserved.
 */
import { UserService } from '../services/user.service';

export class TestingHelper {
  public static getToken(): string {
    let userTokenTemp = localStorage.getItem(UserService.userTokenName);
    let userToken: string = userTokenTemp !== null ? userTokenTemp : "";
    return userToken;
  }
}