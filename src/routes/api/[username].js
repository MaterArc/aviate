import { getUserByUsername, getUserFromCookies, setStatus } from '$lib/db';
import lang from '$lib/statuslang/index';
import { parse } from 'cookie';

export async function get({ params, url }) {
  // This API endpoint is case-insensitive; therefore, 'false' is passed
  // to the getUserByUsername function.
  const user = await getUserByUsername(params.username, false);

  if (!user) {
    return {
      status: 404,
      body: {
        username: params.username,
        status: null,
        success: false,
      },
    };
  }

  if (url.searchParams.get('code') === 'true') {
    return {
      status: 200,
      body: {
        username: user.username,
        status: user.status,
        success: true,
      },
    };
  } else {
    const result = await lang.run(user.username, user.status);

    return {
      status: 200,
      body: {
        username: user.username,
        status: result,
        success: true,
      },
    };
  }
}

export async function post({ params, request }) {
  const toSet = await getUserByUsername(params.username);

  if (!toSet) {
    return {
      status: 404,
    };
  }

  let status;

  try {
    const body = await request.json();
    status = body.status;
    if (status === undefined) return { status: 400 };
  } catch (e) {
    return {
      status: 400,
    };
  }

  if (!status) {
    status = '';
  }

  // Statuses are limited to 200 characters
  if (status.length > 200) {
    return {
      status: 400,
    };
  }

  const cookies = parse(request.headers.get('cookie') || '');
  const user = await getUserFromCookies(cookies);

  if (user) {
    if (user.username === params.username) {
      await setStatus(user.username, status);
      return {
        status: 200,
      };
    } else if (user.is_admin) {
      await setStatus(params.username, status);
      return {
        status: 200,
      };
    } else {
      // Can't set the status of another if you're not an admin
      return {
        status: 403,
      };
    }
  }

  return {
    status: 401,
  };
}
