import requests
import json
import pickle
import urllib.parse


class Site:
    def __init__(self, headers=None, proxies=None):
        self.session = requests.Session()
        if proxies is not None:
            self.session.proxies.update(proxies)
        if headers is not None:
            self.session.headers.update(headers)

    def save_cookies(self, path):
        with open(path, 'wb') as f:
            pickle.dump(self.session.cookies, f)

    def load_cookies(self, path):
        with open(path, 'rb') as f:
            self.session.cookies.update(pickle.load(f))


class Instagram(Site):
    def owner_to_timeline_media(self, user_id, first=12, after=None):
        variables = {
            'id': user_id,
            'first': first
        }
        headers = {
            'Referer': 'https://www.instagram.com/',
            'x-requested-with': 'XMLHttpRequest'
        }
        if 'csrftoken' in self.session.cookies:
            headers['x-csrftoken'] = self.session.cookies['csrftoken']
        if after is not None:
            variables['after'] = after
        response = self.session.get('https://www.instagram.com/graphql/query/', params={
            'query_hash': '003056d32c2554def87228bc3fd9668a',
            'variables': json.dumps(variables, separators=(',', ':'))
        }, headers=headers, allow_redirects=False)
        if response.status_code == 200:
            result = response.json()
            if result['status'] == 'ok':
                return result['data']
            else:
                raise Exception('owner_to_timeline_media failed. {} {} {}'.format(
                    response.status_code, response.reason, response.text))
        else:
            raise Exception('owner_to_timeline_media failed. {} {} {}'.format(
                response.status_code, response.reason, response.text))


class Colymer(Site):
    def __init__(self, api_prefix, **kw):
        super().__init__(**kw)
        self.api_prefix = api_prefix

    def get_articles(self, collection, pipeline, collation=None):
        params = {'pipeline': json.dumps(pipeline, separators=(',', ':'))}
        if collation is not None:
            params['collation'] = json.dumps(collation, separators=(',', ':'))
        response = self.session.get(urllib.parse.urljoin(
            self.api_prefix, 'article/{}'.format(collection)), params=params)
        if response.ok:
            return response.json()
        else:
            raise Exception('GET articles failed. {} {} {}'.format(
                response.status_code, response.reason, response.text))

    def post_article(self, collection, article, resolve_attachments=False, replace=False):
        response = self.session.post(urllib.parse.urljoin(self.api_prefix, 'article/{}'.format(collection)),
                                     params={'resolve_attachments': resolve_attachments, 'replace': replace}, json=article)
        if response.ok:
            return response.json()['_id']
        else:
            raise Exception('POST article failed. {} {} {}'.format(
                response.status_code, response.reason, response.text))

    def get_article(self, collection, _id):
        response = self.session.get(urllib.parse.urljoin(
            self.api_prefix, 'article/{}/{}'.format(collection, _id)))
        if response.ok:
            return response.json()
        else:
            raise Exception('GET article failed. {} {} {}'.format(
                response.status_code, response.reason, response.text))

    def put_article(self, collection, _id, update):
        response = self.session.put(urllib.parse.urljoin(self.api_prefix, 'article/{}/{}'.format(
            collection, _id)), json=update)
        if not response.ok:
            raise Exception('GET article failed. {} {} {}'.format(
                response.status_code, response.reason, response.text))

    def delete_article(self, collection, _id):
        response = self.session.delete(urllib.parse.urljoin(
            self.api_prefix, 'article/{}/{}'.format(collection, _id)))
        if not response.ok:
            raise Exception('GET article failed. {} {} {}'.format(
                response.status_code, response.reason, response.text))
