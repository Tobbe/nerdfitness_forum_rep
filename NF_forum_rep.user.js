// ==UserScript==
// @name         NerdFitness forum rep
// @namespace    https://github.com/tobbe
// @version      0.3
// @description  NerdFitness forum - Display reputation
// @author       Tobbe
// @license      MIT
// @match        https://rebellion.nerdfitness.com/index.php?/topic/*
// @exclude      https://rebellion.nerdfitness.com/index.php?/topic/*&do=embed
// @exclude      https://rebellion.nerdfitness.com/index.php?/topic/*&do=embed&*
// @match        https://rebellion.nerdfitness.com/index.php?/profile/*/
// @grant        GM_listValues
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @connect      self
// ==/UserScript==

function fetchRep(url) {
    const repRegex = /<span\s+class=.cProfileRepScore_points.>\s*(\d+)\s*<\/span>/;

    function xhr(resolve, reject, triesLeft) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url + 'reputation/',
            onload: response => {
                const text = response.responseText;

                try {
                    resolve(text.match(repRegex)[1]);
                } catch (e) {
                    if (triesLeft) {
                        xhr(resolve, reject, --triesLeft);
                    } else {
                        reject('failure');
                    }
                }
            },
        });
    }

    return new Promise((resolve, reject) => {
        xhr(resolve, reject, 4);
    });
}

function getUserId(url) {
    return url
        .replace(/\/*$/, '')
        .split('/')
        .pop();
}

function insertRep(aside, rep) {
    const repInserted = aside.querySelector('li.rep-inserted');

    if (repInserted) {
        repInserted.innerHTML = 'Rep: ' + rep;
    } else {
        aside.querySelectorAll('ul.cAuthorPane_info li').forEach(li => {
            if (li.textContent.endsWith('posts')) {
                const liStr = '<li class="rep-inserted">Rep: ' + rep + '</li>';
                li.insertAdjacentHTML('beforebegin', liStr);
            }
        });
    }
}

function enqueueAsides() {
    const queue = {};

    document.querySelectorAll('aside.ipsComment_author').forEach(aside => {
        const url = aside.querySelector('h3.cAuthorPane_author a').href;

        if (queue[url]) {
            queue[url].push(aside);
        } else {
            queue[url] = [aside];
        }
    });

    return queue;
}

function displayForumRep() {
    const queue = enqueueAsides();
    const cache = GM_getValue('cache');

    Object.entries(queue).forEach(([url, asides]) => {
        const userId = getUserId(url);

        // insert reps from cache
        // if we don't have a cached rep for this userId, print 'fetching...'
        // instead
        asides.forEach(aside => {
            insertRep(aside, cache[userId] || 'fetching...');
        });

        // cached reps from above might be old, so fetch the latest reps and
        // update the displayed value
        fetchRep(url).then(rep => {
            const userId = getUserId(url);

            if (cache[userId] !== rep) {
                asides.forEach(aside => {
                    insertRep(aside, rep);
                });

                cache[userId] = rep;

                GM_setValue('cache', cache);
            }
        });
    });
}

function displayProfileRep() {
    const url = window.location.href;

    fetchRep(url).then(rep => {
        document.querySelectorAll('#elProfileStats li').forEach(li => {
            if (li.textContent.indexOf('Content Count') !== -1) {
                const liStr = `
                    <li>
                        <h4 class="ipsType_minorHeading">Reputation</h4>
                        ${rep}
                    </li>`;
                li.insertAdjacentHTML('afterend', liStr);
            }
        });
    });
}

(function() {
    'use strict';

    displayForumRep();
    displayProfileRep();
})();
